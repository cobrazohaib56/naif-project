import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  try {
    const session = await requireAuth();
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId } = await params;

    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .select("id, quiz_id, user_id, started_at, submitted_at, score")
      .eq("id", attemptId)
      .eq("user_id", userId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const { data: quiz } = await supabase
      .from("quizzes")
      .select("id, title")
      .eq("id", attempt.quiz_id)
      .single();

    const { data: questions } = await supabase
      .from("questions")
      .select("id, question_text, question_type, order_index")
      .eq("quiz_id", attempt.quiz_id)
      .order("order_index");

    const { data: answers } = await supabase
      .from("answers")
      .select("question_id, selected_option_id, written_answer")
      .eq("attempt_id", attemptId);

    const answerMap = new Map(
      (answers ?? []).map((a) => [a.question_id, a])
    );

    const results: {
      questionId: string;
      questionText: string;
      questionType: string;
      options: { id: string; text: string; isCorrect: boolean }[];
      userSelectedOptionId: string | null;
      userWrittenAnswer: string | null;
      correctOptionId: string | null;
      isCorrect: boolean;
    }[] = [];

    for (const q of questions ?? []) {
      const { data: opts } = await supabase
        .from("options")
        .select("id, option_text, is_correct")
        .eq("question_id", q.id)
        .order("id");
      const options = opts ?? [];
      const correctOpt = options.find((o) => o.is_correct);
      const ans = answerMap.get(q.id);
      const selectedId = ans?.selected_option_id ?? null;
      const isCorrect = q.question_type === "mcq"
        ? !!correctOpt && selectedId === correctOpt.id
        : false;

      results.push({
        questionId: q.id,
        questionText: q.question_text,
        questionType: q.question_type,
        options: options.map((o) => ({
          id: o.id,
          text: o.option_text,
          isCorrect: o.is_correct,
        })),
        userSelectedOptionId: selectedId,
        userWrittenAnswer: ans?.written_answer ?? null,
        correctOptionId: correctOpt?.id ?? null,
        isCorrect,
      });
    }

    results.sort((a, b) => {
      const qA = questions?.find((q) => q.id === a.questionId);
      const qB = questions?.find((q) => q.id === b.questionId);
      return (qA?.order_index ?? 0) - (qB?.order_index ?? 0);
    });

    const total = results.length;
    const score = attempt.score ?? 0;

    return NextResponse.json({
      attemptId: attempt.id,
      quizId: attempt.quiz_id,
      quizTitle: quiz?.title ?? "Quiz",
      score,
      total,
      percentage: total > 0 ? Math.round((score / total) * 100) : 0,
      submittedAt: attempt.submitted_at,
      questions: results,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed to get attempt" }, { status: 500 });
  }
}
