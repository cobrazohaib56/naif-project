export type UserRole = "student" | "admin";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  name?: string;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_path: string;
  upload_date: string;
  extracted_text?: string | null;
}

export interface Summary {
  id: string;
  document_id: string;
  summary_text: string;
  key_concepts: string[] | Record<string, unknown>;
  generated_at: string;
  status: string;
}

export interface Quiz {
  id: string;
  admin_id: string;
  title: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  time_limit_minutes?: number | null;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  order_index: number;
}

export interface Option {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
}

export interface Answer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_id: string | null;
  written_answer: string | null;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  due_date: string;
  priority: string;
  is_completed: boolean;
  reminder_time: string | null;
}

export interface WritingSession {
  id: string;
  user_id: string;
  original_text: string;
  improved_text: string;
  session_date: string;
  improvement_metadata: Record<string, unknown> | null;
}

export interface RagDocument {
  id: string;
  admin_id: string;
  title: string;
  file_path: string;
  content_type?: string | null;
  department?: string | null;
  course?: string | null;
  uploaded_at: string;
}

export interface RagChunk {
  id: string;
  rag_document_id: string;
  chunk_text: string;
  embedding: number[];
  metadata: Record<string, unknown> | null;
  created_at: string;
}
