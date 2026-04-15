import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { embedText } from "@/lib/embeddings";
import { callLlm } from "@/lib/llm";
import { RAG_ANSWER_PROMPT } from "@/lib/prompts";

const bodySchema = z.object({
  question: z.string().min(1).max(2000),
  courseFilter: z.string().optional(),
});

const TOP_K = 5;

export async function POST(request: Request) {
  try {
    await requireAuth();

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const { question, courseFilter } = parsed.data;

    let embedding: number[];
    try {
      embedding = await embedText(question);
    } catch (e) {
      return NextResponse.json(
        { error: "Embedding service unavailable. Check that HUGGINGFACE_API_KEY is set and the embedding model is accessible." },
        { status: 503 }
      );
    }

    if (embedding.length === 0) {
      return NextResponse.json(
        { error: "Could not generate embedding" },
        { status: 500 }
      );
    }

    const embeddingStr = `[${embedding.join(",")}]`;
    const { data: chunks, error } = await supabase.rpc("match_rag_chunks", {
      query_embedding: embeddingStr,
      match_count: TOP_K * 3,
    });

    if (error) {
      console.error("match_rag_chunks RPC error:", error.message);
      return NextResponse.json({ error: "Failed to search knowledge base" }, { status: 500 });
    }

    let chunkList = (chunks ?? []) as { id: string; rag_document_id: string; chunk_text: string; metadata?: { page?: number } }[];
    const docIdsFromChunks = [...new Set(chunkList.map((c) => c.rag_document_id))];
    const { data: docs } = await supabase
      .from("rag_documents")
      .select("id, title, course")
      .in("id", docIdsFromChunks);
    const docMap = new Map((docs ?? []).map((d) => [d.id, d]));

    if (courseFilter && courseFilter.trim()) {
      const allowedDocIds = new Set(
        (docs ?? []).filter((d) => d.course && d.course.toLowerCase().includes(courseFilter.trim().toLowerCase())).map((d) => d.id)
      );
      chunkList = chunkList.filter((c) => allowedDocIds.has(c.rag_document_id));
    }
    chunkList = chunkList.slice(0, TOP_K);

    if (chunkList.length === 0) {
      return NextResponse.json({
        answer: "I don't have relevant UNITEN documents indexed yet. An admin can upload policy and course documents for me to answer from.",
        sources: [],
      });
    }

    const docMapTitles = new Map((docs ?? []).map((d) => [d.id, d.title]));

    const context = chunkList
      .map((c) => {
        const title = docMapTitles.get(c.rag_document_id) ?? "Document";
        const page = c.metadata?.page ?? "?";
        return `[${title}, Page ${page}]\n${c.chunk_text}`;
      })
      .join("\n\n");

    const answer = await callLlm(RAG_ANSWER_PROMPT(context), `Question: ${question}`);

    const sources = chunkList.map((c) => ({
      documentId: c.rag_document_id,
      documentTitle: docMapTitles.get(c.rag_document_id) ?? "Document",
      pageNumber: c.metadata?.page,
      relevantText: c.chunk_text?.slice(0, 200),
    }));

    return NextResponse.json({
      answer: answer.trim(),
      sources,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[rag/ask] Error:", msg);
    return NextResponse.json(
      { error: msg || "RAG ask failed" },
      { status: 500 }
    );
  }
}
