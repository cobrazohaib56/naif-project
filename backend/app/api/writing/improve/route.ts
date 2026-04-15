import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { callLlm } from "@/lib/llm";
import { WRITING_IMPROVE_PROMPT } from "@/lib/prompts";

const bodySchema = z.object({
  originalText: z.string().min(1).max(50000),
});

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
      return NextResponse.json({ error: "originalText is required" }, { status: 400 });
    }

    const { originalText } = parsed.data;
    const response = await callLlm(WRITING_IMPROVE_PROMPT, originalText);

    let improvedText = originalText;
    let suggestions: { type: string; original: string; improved: string; explanation: string }[] = [];

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]) as {
          improvedText?: string;
          suggestions?: { type: string; original: string; improved: string; explanation: string }[];
        };
        if (data.improvedText) improvedText = data.improvedText;
        if (Array.isArray(data.suggestions)) suggestions = data.suggestions;
      }
    } catch {
      improvedText = response.trim() || originalText;
    }

    const { error: insertErr } = await supabase.from("writing_sessions").insert({
      user_id: userId,
      original_text: originalText,
      improved_text: improvedText,
      improvement_metadata: { suggestions },
    });
    if (insertErr) console.error("Failed to save writing session:", insertErr.message);

    return NextResponse.json({
      improvedText,
      suggestions: suggestions.map((s) => ({
        type: s.type === "grammar" || s.type === "clarity" || s.type === "style" ? s.type : "style",
        original: s.original,
        improved: s.improved,
        explanation: s.explanation,
        highlight: s.original,
      })),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[writing/improve] Error:", msg);
    return NextResponse.json(
      { error: msg || "Writing improvement failed" },
      { status: 500 }
    );
  }
}
