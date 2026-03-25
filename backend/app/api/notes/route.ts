import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: documents, error } = await supabase
      .from("documents")
      .select("id, file_name, file_type, upload_date")
      .eq("user_id", userId)
      .order("upload_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check which documents have summaries
    const docIds = (documents ?? []).map((d) => d.id);
    const { data: summaries } = await supabase
      .from("summaries")
      .select("document_id")
      .in("document_id", docIds);

    const summarizedSet = new Set((summaries ?? []).map((s) => s.document_id));

    const notes = (documents ?? []).map((d) => ({
      id: d.id,
      name: d.file_name,
      date: d.upload_date,
      fileType: d.file_type,
      summarized: summarizedSet.has(d.id),
    }));

    return NextResponse.json(notes);
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed to list notes" }, { status: 500 });
  }
}
