import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data: doc, error } = await supabase
      .from("documents")
      .select("id, file_name, file_type, file_path, upload_date")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const { data: signed } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 3600);

    const { data: summary } = await supabase
      .from("summaries")
      .select("id, summary_text, key_concepts, generated_at, status")
      .eq("document_id", id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      id: doc.id,
      file_name: doc.file_name,
      file_type: doc.file_type,
      upload_date: doc.upload_date,
      download_url: signed?.signedUrl ?? null,
      summary: summary
        ? {
            summary_text: summary.summary_text,
            key_concepts: summary.key_concepts,
            generated_at: summary.generated_at,
            status: summary.status,
          }
        : null,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed to get document" }, { status: 500 });
  }
}
