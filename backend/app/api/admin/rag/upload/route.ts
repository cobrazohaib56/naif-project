import { NextResponse } from "next/server";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { extractTextFromBuffer, isAllowedMime } from "@/lib/extract-text";
import { chunkText } from "@/lib/chunk";
import { embedText } from "@/lib/embeddings";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    requireAdmin(session);
    const adminId = (session.user as { id?: string }).id;
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "Untitled";
    const department = (formData.get("department") as string) || null;
    const course = (formData.get("course") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    const mime = file.type;
    if (!isAllowedMime(mime)) {
      return NextResponse.json(
        { error: "Only PDF, DOCX, and TXT files are allowed" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

    const { data: docRow, error: insertError } = await supabase
      .from("rag_documents")
      .insert({
        admin_id: adminId,
        title: title || file.name,
        file_path: "",
        content_type: mime,
        department,
        course,
      })
      .select("id")
      .single();

    if (insertError || !docRow) {
      return NextResponse.json({ error: insertError?.message ?? "Failed to create document" }, { status: 500 });
    }

    const path = `rag/${docRow.id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("rag")
      .upload(path, buffer, {
        contentType: mime,
        upsert: true,
      });

    if (uploadError) {
      await supabase.from("rag_documents").delete().eq("id", docRow.id);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    await supabase
      .from("rag_documents")
      .update({ file_path: path })
      .eq("id", docRow.id);

    let text: string;
    try {
      text = await extractTextFromBuffer(buffer, mime, file.name);
    } catch (e) {
      await supabase.from("rag_documents").delete().eq("id", docRow.id);
      return NextResponse.json(
        { error: "Could not extract text from file" },
        { status: 400 }
      );
    }

    if (!text || text.length < 50) {
      return NextResponse.json(
        { error: "Extracted text too short" },
        { status: 400 }
      );
    }

    const chunks = chunkText(text, 500, 50);
    let indexed = 0;
    let firstError: string | null = null;

    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await embedText(chunks[i]);
        if (embedding.length === 0) {
          if (!firstError) firstError = "Embedding API returned an empty vector";
          continue;
        }
        await supabase.from("rag_chunks").insert({
          rag_document_id: docRow.id,
          chunk_text: chunks[i],
          embedding,
          metadata: { page: Math.floor(i / 5) + 1 },
        });
        indexed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[rag/upload] Chunk ${i} embedding failed:`, msg);
        if (!firstError) firstError = msg;
      }
    }

    if (indexed === 0) {
      await supabase.from("rag_chunks").delete().eq("rag_document_id", docRow.id);
      await supabase.from("rag_documents").delete().eq("id", docRow.id);
      await supabase.storage.from("rag").remove([path]).catch(() => {});
      return NextResponse.json(
        {
          error:
            "Indexing failed — embeddings could not be generated. " +
            (firstError ? `Reason: ${firstError}. ` : "") +
            "Verify HUGGINGFACE_API_KEY is valid and has Inference permission.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      status: "ok",
      documentId: docRow.id,
      chunksIndexed: indexed,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
