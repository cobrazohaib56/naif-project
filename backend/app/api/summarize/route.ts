import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { callLlm } from "@/lib/llm";
import { SUMMARIZE_PROMPT } from "@/lib/prompts";

const bodySchema = z.object({
  documentId: z.string().uuid().optional(),
  documentText: z.string().optional(),
}).refine((d) => d.documentId ?? d.documentText, { message: "Provide documentId or documentText" });

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
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    let text: string;
    let documentId: string | null = null;

    if (parsed.data.documentId) {
      const { data: doc, error } = await supabase
        .from("documents")
        .select("id, extracted_text")
        .eq("id", parsed.data.documentId)
        .eq("user_id", userId)
        .single();

      if (error || !doc) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }
      text = doc.extracted_text ?? "";
      documentId = doc.id;
      if (!text.trim()) {
        return NextResponse.json(
          { error: "Document has no extractable text" },
          { status: 400 }
        );
      }
    } else {
      text = (parsed.data.documentText ?? "").slice(0, 100000);
    }

    const response = await callLlm(SUMMARIZE_PROMPT, text);
    let summaryText = response;
    let keyConcepts: string[] = [];

    const keyMatch = response.match(/KEY_CONCEPTS:\s*(\[[\s\S]*?\])/);
    if (keyMatch) {
      try {
        keyConcepts = JSON.parse(keyMatch[1]) as string[];
      } catch {
        // ignore
      }
      summaryText = response.replace(/\s*KEY_CONCEPTS:[\s\S]*$/, "").replace(/^SUMMARY:\s*/i, "").trim();
    } else {
      summaryText = response.replace(/^SUMMARY:\s*/i, "").trim();
    }

    if (documentId) {
      await supabase.from("summaries").insert({
        document_id: documentId,
        summary_text: summaryText,
        key_concepts: keyConcepts,
        status: "completed",
      });
    }

    return NextResponse.json({
      summary: summaryText,
      keyConcepts: Array.isArray(keyConcepts) ? keyConcepts : [],
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Summarization failed" },
      { status: 500 }
    );
  }
}
