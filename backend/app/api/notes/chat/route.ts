import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { callLlm } from "@/lib/llm";

const bodySchema = z.object({
  documentId: z.string().uuid(),
  question: z.string().min(1).max(2000),
});

const DOC_CHAT_PROMPT = (context: string) =>
  `You are an academic assistant. Answer the question using ONLY the following document excerpt. If the answer is not in the text, say so.

Document excerpt:
${context}

Instructions: Answer concisely based only on the text above.`;

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
      return NextResponse.json({ error: "documentId and question required" }, { status: 400 });
    }

    const { documentId, question } = parsed.data;

    const { data: doc, error } = await supabase
      .from("documents")
      .select("id, extracted_text, file_name")
      .eq("id", documentId)
      .eq("user_id", userId)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const text = doc.extracted_text ?? "";
    if (!text.trim()) {
      return NextResponse.json({
        answer: "This document has no extractable text to answer from.",
        pageReferences: [],
      });
    }

    const context = text.slice(0, 12000);
    const answer = await callLlm(DOC_CHAT_PROMPT(context), `Question: ${question}`);

    return NextResponse.json({
      answer: answer.trim(),
      pageReferences: [{ documentTitle: doc.file_name, snippet: context.slice(0, 300) }],
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Document chat failed" },
      { status: 500 }
    );
  }
}
