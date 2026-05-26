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

    // Each user only sees and manages their own uploaded documents.
    const { data: docs, error } = await supabase
      .from("rag_documents")
      .select("id, title, content_type, department, course, uploaded_at")
      .eq("admin_id", userId)
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

export async function DELETE(request: Request) {
  try {
    const session = await requireAuth();
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Document id is required" }, { status: 400 });
    }

    const { data: doc, error: docError } = await supabase
      .from("rag_documents")
      .select("id, file_path")
      .eq("id", id)
      .eq("admin_id", userId)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("rag_documents")
      .delete()
      .eq("id", id)
      .eq("admin_id", userId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (doc.file_path) {
      const { error: storageError } = await supabase.storage
        .from("rag")
        .remove([doc.file_path]);

      if (storageError) {
        console.error("[rag/documents] Failed to remove storage file:", storageError.message);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
