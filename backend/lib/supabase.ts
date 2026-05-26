import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function getSupabaseConnectionError(error: unknown): string | null {
  const message =
    error instanceof Error
      ? error.message
      : (error as { message?: string })?.message ?? String(error);
  const cause = (error as { cause?: { code?: string; hostname?: string } })?.cause;

  if (
    message === "fetch failed" ||
    message === "TypeError: fetch failed" ||
    cause?.code === "ENOTFOUND" ||
    cause?.code === "ECONNREFUSED" ||
    cause?.code === "ETIMEDOUT"
  ) {
    const detail = cause?.code ? ` (${cause.code}${cause.hostname ? `: ${cause.hostname}` : ""})` : "";
    return `Database service unavailable${detail}. Check NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and backend network/DNS access.`;
  }

  return null;
}

export type { User, Document, Summary, Quiz, Question, Option, QuizAttempt, Answer, Task, WritingSession, RagDocument, RagChunk } from "./types";
