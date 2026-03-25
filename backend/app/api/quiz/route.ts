import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const userId = (session.user as { id?: string }).id;
    const role = (session.user as { role?: string }).role;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const admin = searchParams.get("admin") === "true";

    let query = supabase
      .from("quizzes")
      .select("id, title, description, is_active, created_at, time_limit_minutes");

    if (role !== "admin" || !admin) {
      query = query.eq("is_active", true);
    }

    const { data: quizzes, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const withCount = await Promise.all(
      (quizzes ?? []).map(async (q) => {
        const { count } = await supabase
          .from("questions")
          .select("id", { count: "exact", head: true })
          .eq("quiz_id", q.id);
        return { ...q, questions: count ?? 0 };
      })
    );

    return NextResponse.json(withCount);
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed to list quizzes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    requireAdmin(session);
    const adminId = (session.user as { id?: string }).id;
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, time_limit_minutes, is_active = true } = body;

    const { data: quiz, error } = await supabase
      .from("quizzes")
      .insert({
        admin_id: adminId,
        title: title ?? "Untitled Quiz",
        description: description ?? null,
        time_limit_minutes: time_limit_minutes ?? null,
        is_active: !!is_active,
      })
      .select("id, title, description, is_active, time_limit_minutes")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(quiz);
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
