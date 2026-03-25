import { NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await requireAuth();
    requireAdmin(session);

    const { data: docs, error } = await supabase
      .from("rag_documents")
      .select("id, title, content_type, department, course, uploaded_at")
      .order("uploaded_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const withChunks = await Promise.all(
      (docs ?? []).map(async (d) => {
        const { count } = await supabase
          .from("rag_chunks")
          .select("id", { count: "exact", head: true })
          .eq("rag_document_id", d.id);
        return { ...d, chunksCount: count ?? 0 };
      })
    );

    return NextResponse.json(withChunks);
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed to list documents" }, { status: 500 });
  }
}
