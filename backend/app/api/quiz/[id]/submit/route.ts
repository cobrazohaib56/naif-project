import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const bodySchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    selectedOptionId: z.string().uuid().optional().nullable(),
    writtenAnswer: z.string().optional().nullable(),
  })),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quizId } = await params;
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid answers format" }, { status: 400 });
    }

    const { data: quiz } = await supabase
      .from("quizzes")
      .select("id")
      .eq("id", quizId)
      .eq("is_active", true)
      .single();

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .insert({
        user_id: userId,
        quiz_id: quizId,
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: attemptError?.message ?? "Failed to save attempt" }, { status: 500 });
    }

    let score = 0;
    const questions = await supabase
      .from("questions")
      .select("id")
      .eq("quiz_id", quizId);
    const questionIds = (questions.data ?? []).map((q) => q.id);
    const total = questionIds.length;

    for (const a of parsed.data.answers) {
      if (!questionIds.includes(a.questionId)) continue;
      let correct = false;
      if (a.selectedOptionId) {
        const { data: opt } = await supabase
          .from("options")
          .select("is_correct")
          .eq("id", a.selectedOptionId)
          .single();
        correct = !!opt?.is_correct;
      }
      if (correct) score++;

      await supabase.from("answers").insert({
        attempt_id: attempt.id,
        question_id: a.questionId,
        selected_option_id: a.selectedOptionId ?? null,
        written_answer: a.writtenAnswer ?? null,
      });
    }

    await supabase
      .from("quiz_attempts")
      .update({ score })
      .eq("id", attempt.id);

    return NextResponse.json({
      attemptId: attempt.id,
      score,
      total,
      percentage: total > 0 ? Math.round((score / total) * 100) : 0,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Submit failed" }, { status: 500 });
  }
}
