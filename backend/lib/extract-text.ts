import pdf from "pdf-parse";
import mammoth from "mammoth";

const ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];

export function isAllowedMime(mime: string): boolean {
  return ALLOWED_TYPES.includes(mime);
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    const data = await pdf(buffer);
    return data.text;
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.toLowerCase().endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (mimeType === "text/plain" || fileName.toLowerCase().endsWith(".txt")) {
    return buffer.toString("utf-8");
  }
  throw new Error("Unsupported file type for text extraction");
}
