import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { callLlm } from "@/lib/llm";
import { QUIZ_GENERATE_PROMPT } from "@/lib/prompts";

const bodySchema = z.object({
  ragDocumentId: z.string().uuid().optional(),
  documentId: z.string().uuid().optional(),
  documentText: z.string().optional(),
  numQuestions: z.number().min(1).max(20).default(10),
  questionType: z.enum(["mcq", "short"]).default("mcq"),
}).refine(
  (d) => d.ragDocumentId || d.documentId || d.documentText,
  { message: "Provide ragDocumentId, documentId, or documentText" }
);

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    requireAdmin(session);
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    let text: string;

    if (parsed.data.ragDocumentId) {
      // Verify the document belongs to the requesting user.
      const { data: ragDoc } = await supabase
        .from("rag_documents")
        .select("id")
        .eq("id", parsed.data.ragDocumentId)
        .eq("admin_id", userId)
        .single();

      if (!ragDoc) {
        return NextResponse.json({ error: "RAG document not found" }, { status: 404 });
      }

      const { data: chunks, error: chunksErr } = await supabase
        .from("rag_chunks")
        .select("chunk_text, created_at")
        .eq("rag_document_id", parsed.data.ragDocumentId)
        .order("created_at", { ascending: true });

      if (chunksErr) {
        console.error("[quiz/generate] Failed to load RAG chunks:", chunksErr.message);
        return NextResponse.json({ error: "Failed to load RAG document" }, { status: 500 });
      }

      text = (chunks ?? []).map((c) => c.chunk_text).join("\n\n").slice(0, 80000);
    } else if (parsed.data.documentId) {
      const { data: doc } = await supabase
        .from("documents")
        .select("extracted_text")
        .eq("id", parsed.data.documentId)
        .single();
      text = doc?.extracted_text ?? "";
    } else {
      text = (parsed.data.documentText ?? "").slice(0, 80000);
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "No text available for quiz generation" }, { status: 400 });
    }

    const prompt = QUIZ_GENERATE_PROMPT(parsed.data.numQuestions, parsed.data.questionType);
    const response = await callLlm(prompt, text);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse quiz from model response" }, { status: 500 });
    }

    const data = JSON.parse(jsonMatch[0]) as {
      questions?: { question: string; options?: string[]; correctAnswer?: string; answer?: string }[];
    };
    const questions = data.questions ?? [];

    const out = questions.map((q, i) => ({
      questionText: q.question,
      options: q.options ?? [],
      correctAnswer: q.correctAnswer ?? q.answer ?? "",
      type: parsed.data.questionType,
      order_index: i,
    }));

    return NextResponse.json({ questions: out });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Quiz generation failed" },
      { status: 500 }
    );
  }
}
