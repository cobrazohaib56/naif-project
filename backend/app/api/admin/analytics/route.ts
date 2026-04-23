import { NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const [usersRes, docsRes, quizzesRes, ragRes] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("documents").select("id", { count: "exact", head: true }),
      supabase.from("quizzes").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("rag_documents").select("id", { count: "exact", head: true }),
    ]);

    const totalStudents = usersRes.count ?? 0;
    const totalDocuments = docsRes.count ?? 0;
    const activeQuizzes = quizzesRes.count ?? 0;
    const ragDocuments = ragRes.count ?? 0;

    return NextResponse.json({
      totalStudents,
      totalDocuments,
      activeQuizzes,
      ragDocumentsIndexed: ragDocuments,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed to get analytics" }, { status: 500 });
  }
}
