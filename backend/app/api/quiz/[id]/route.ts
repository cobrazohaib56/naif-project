import { NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    // "admin" view exposes correct answers for the quiz manager UI. With RBAC
    // removed, any authenticated user may request it (useful when editing
    // their own quizzes).
    const isAdminView = searchParams.get("admin") === "true";
    const modeTake = searchParams.get("mode") === "take" || !isAdminView;

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("id, title, description, time_limit_minutes, is_active")
      .eq("id", id)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (modeTake && !quiz.is_active) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("id, question_text, question_type, order_index")
      .eq("quiz_id", id)
      .order("order_index");

    if (qError) {
      return NextResponse.json({ error: qError.message }, { status: 500 });
    }

    const withOptions = await Promise.all(
      (questions ?? []).map(async (q) => {
        const { data: opts } = await supabase
          .from("options")
          .select("id, option_text, is_correct")
          .eq("question_id", q.id)
          .order("id");
        const options = opts ?? [];
        const correctIndex = options.findIndex((o) => o.is_correct);
        const base = {
          id: q.id,
          question: q.question_text,
          question_type: q.question_type,
          order_index: q.order_index,
          options: options.map((o) => o.option_text),
          optionIds: options.map((o) => o.id),
        };
        if (isAdminView) {
          return { ...base, correct: correctIndex >= 0 ? correctIndex : 0 };
        }
        return base;
      })
    );

    return NextResponse.json({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      time_limit_minutes: quiz.time_limit_minutes,
      questions: withOptions.sort((a, b) => a.order_index - b.order_index),
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed to get quiz" }, { status: 500 });
  }
}

export async function PUT(
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

    const { id } = await params;
    const { data: quiz } = await supabase
      .from("quizzes")
      .select("id, admin_id")
      .eq("id", id)
      .single();

    if (!quiz || quiz.admin_id !== adminId) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const body = await request.json();
    const updates: { title?: string; description?: string | null; time_limit_minutes?: number | null; is_active?: boolean } = {};
    if (typeof body.title === "string") updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description ?? null;
    if (body.time_limit_minutes !== undefined) updates.time_limit_minutes = body.time_limit_minutes ?? null;
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;

    const { error } = await supabase
      .from("quizzes")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    requireAdmin(session);
    const adminId = (session.user as { id?: string }).id;
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { data: quiz } = await supabase
      .from("quizzes")
      .select("id, admin_id")
      .eq("id", id)
      .single();

    if (!quiz || quiz.admin_id !== adminId) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
