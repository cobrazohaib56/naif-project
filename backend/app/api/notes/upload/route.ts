import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { extractTextFromBuffer, isAllowedMime } from "@/lib/extract-text";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
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
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    const { data: docRow, error: insertError } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        file_name: file.name,
        file_type: ext,
        file_path: "", // set after upload
      })
      .select("id")
      .single();

    if (insertError || !docRow) {
      return NextResponse.json({ error: insertError?.message ?? "Failed to create document" }, { status: 500 });
    }

    const path = `notes/${userId}/${docRow.id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, buffer, {
        contentType: mime,
        upsert: true,
      });

    if (uploadError) {
      await supabase.from("documents").delete().eq("id", docRow.id);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    await supabase
      .from("documents")
      .update({ file_path: path })
      .eq("id", docRow.id);

    let extracted_text: string | null = null;
    try {
      extracted_text = await extractTextFromBuffer(buffer, mime, safeName);
      if (extracted_text && extracted_text.length > 500000) {
        extracted_text = extracted_text.slice(0, 500000);
      }
    } catch {
      // leave extracted_text null if extraction fails
    }

    if (extracted_text) {
      await supabase
        .from("documents")
        .update({ extracted_text })
        .eq("id", docRow.id);
    }

    return NextResponse.json({
      id: docRow.id,
      file_name: file.name,
      file_path: path,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
