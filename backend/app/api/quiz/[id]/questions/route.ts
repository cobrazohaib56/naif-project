import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const questionSchema = z.object({
  questionText: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.number()]).optional(),
  answer: z.string().optional(),
  type: z.enum(["mcq", "short"]).optional(),
});

const bodySchema = z.object({
  questions: z.array(questionSchema),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    requireAdmin(session);
    const adminId = (session.user as { id?: string }).id;
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quizId } = await params;

    const { data: quiz } = await supabase
      .from("quizzes")
      .select("id, admin_id")
      .eq("id", quizId)
      .single();

    if (!quiz || quiz.admin_id !== adminId) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid questions format" }, { status: 400 });
    }

    // Get current max order_index
    const { data: existing } = await supabase
      .from("questions")
      .select("order_index")
      .eq("quiz_id", quizId)
      .order("order_index", { ascending: false })
      .limit(1);
    const startIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

    for (let i = 0; i < parsed.data.questions.length; i++) {
      const q = parsed.data.questions[i];
      const { data: question, error: qErr } = await supabase
        .from("questions")
        .insert({
          quiz_id: quizId,
          question_text: q.questionText,
          question_type: q.type ?? "mcq",
          order_index: startIndex + i,
        })
        .select("id")
        .single();

      if (qErr || !question) continue;

      if (q.options && q.options.length > 0) {
        const correctIdx = typeof q.correctAnswer === "number"
          ? q.correctAnswer
          : typeof q.correctAnswer === "string" && /^[A-D]$/i.test(q.correctAnswer)
            ? q.correctAnswer.toUpperCase().charCodeAt(0) - 65
            : 0;
        for (let j = 0; j < q.options.length; j++) {
          await supabase.from("options").insert({
            question_id: question.id,
            option_text: q.options[j],
            is_correct: j === correctIdx,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed to add questions" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    requireAdmin(session);
    const adminId = (session.user as { id?: string }).id;
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quizId } = await params;
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json({ error: "questionId query param required" }, { status: 400 });
    }

    const { data: quiz } = await supabase
      .from("quizzes")
      .select("id, admin_id")
      .eq("id", quizId)
      .single();

    if (!quiz || quiz.admin_id !== adminId) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Options cascade-delete via FK
    const { error } = await supabase
      .from("questions")
      .delete()
      .eq("id", questionId)
      .eq("quiz_id", quizId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Question deleted" });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}
