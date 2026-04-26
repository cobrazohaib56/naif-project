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
    const session = await requireAuth();
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const { question, courseFilter } = parsed.data;

    let embedding: number[];
    try {
      embedding = await embedText(question, "query");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[rag/ask] Embedding failed:", msg);
      return NextResponse.json(
        { error: `Embedding service unavailable. ${msg}` },
        { status: 503 }
      );
    }

    if (embedding.length === 0) {
      return NextResponse.json(
        { error: "Could not generate embedding" },
        { status: 500 }
      );
    }

    // Fetch this user's document IDs upfront so we only search their own knowledge base.
    const { data: userDocs } = await supabase
      .from("rag_documents")
      .select("id")
      .eq("admin_id", userId);
    const userDocIds = new Set((userDocs ?? []).map((d) => d.id));

    if (userDocIds.size === 0) {
      return NextResponse.json({
        answer: "You haven't uploaded any documents yet. Go to the Knowledge Base page to upload a document, then come back and ask questions about it.",
        sources: [],
      });
    }

    const embeddingStr = `[${embedding.join(",")}]`;
    // Search only this user's indexed chunks (not global top-K then filter).
    // Using match_rag_chunks + filter could return empty when the user's chunks
    // are not among the most similar in the whole database.
    const { data: chunks, error } = await supabase.rpc("match_rag_chunks_for_user", {
      query_embedding: embeddingStr,
      owner_user_id: userId,
      match_count: TOP_K * 3,
    });

    if (error) {
      console.error("match_rag_chunks_for_user RPC error:", error.message);
      return NextResponse.json(
        { error: "Failed to search knowledge base. If this is a new deploy, run migration 005_match_rag_chunks_for_user.sql in Supabase." },
        { status: 500 }
      );
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
        answer:
          "No indexed text was found in your knowledge base for this search. " +
          "On the Knowledge Base page, confirm your documents show a chunk count above 0. " +
          "If a document has 0 chunks, re-upload it or check that JINA_API_KEY (or HUGGINGFACE_API_KEY) is set on the server.",
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
