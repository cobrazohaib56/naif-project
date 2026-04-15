const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/** Use in auth forms when catch shows "Failed to fetch" (backend unreachable or CORS). */
export function getAuthErrorMessage(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : fallback;
  if (msg === "Failed to fetch" || /network|load failed/i.test(msg)) {
    return `Cannot reach the backend. Ensure it's running at ${API_URL} and was restarted after CORS changes. Check the browser console (F12) for CORS or network errors.`;
  }
  return msg;
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let err: { error?: string } = {};
    try {
      err = JSON.parse(text);
    } catch {
      err = { error: text || res.statusText };
    }
    throw new Error(err.error || "Request failed");
  }
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as T;
  }
}

export async function fetchWithCredentials(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...getHeaders(),
      ...(options.headers as Record<string, string>),
    },
  });
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────
  async getSession(): Promise<{ user: { id?: string; email?: string | null; name?: string | null; role?: string } } | null> {
    const res = await fetchWithCredentials("/api/auth/session");
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user ? data : null;
  },

  async register(email: string, password: string, name?: string) {
    const res = await fetchWithCredentials("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    return handleResponse<{ id: string; email: string; role: string; name?: string; emailSent?: boolean }>(res);
  },

  async signIn(email: string, password: string) {
    const csrfRes = await fetchWithCredentials("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json().catch(() => ({ csrfToken: "" }));
    const res = await fetchWithCredentials("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        email,
        password,
        csrfToken: csrfToken || "",
        callbackUrl: `${API_URL}`,
        json: "true",
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || "Invalid email or password");
    }
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return res.json();
    return {} as { url?: string };
  },

  async signOut() {
    const csrfRes = await fetchWithCredentials("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json().catch(() => ({ csrfToken: "" }));
    await fetchWithCredentials("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: csrfToken || "", json: "true" }),
    });
  },

  async forgotPassword(email: string) {
    const res = await fetchWithCredentials("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return handleResponse<{ message: string }>(res);
  },

  async resetPassword(token: string, password: string) {
    const res = await fetchWithCredentials("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
    return handleResponse<{ message: string }>(res);
  },

  // ── User Profile ─────────────────────────────────────────────────────
  async getProfile() {
    const res = await fetchWithCredentials("/api/user/profile");
    return handleResponse<{ id: string; email: string; name: string | null; role: string; created_at: string }>(res);
  },

  async updateProfile(updates: { name?: string }) {
    const res = await fetchWithCredentials("/api/user/profile", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    return handleResponse<{ id: string; email: string; name: string | null; role: string; created_at: string }>(res);
  },

  // ── Notes ────────────────────────────────────────────────────────────
  async getNotes() {
    const res = await fetchWithCredentials("/api/notes");
    return handleResponse<{ id: string; name: string; date: string; fileType: string; summarized: boolean }[]>(res);
  },

  async getNote(id: string) {
    const res = await fetchWithCredentials(`/api/notes/${id}`);
    return handleResponse<{
      id: string;
      file_name: string;
      file_type: string;
      upload_date: string;
      download_url: string | null;
      summary: { summary_text: string; key_concepts: string[]; generated_at: string; status: string } | null;
    }>(res);
  },

  async uploadNote(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/api/notes/upload`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    return handleResponse<{ id: string; file_name: string; file_path: string }>(res);
  },

  async deleteNote(id: string) {
    const res = await fetchWithCredentials(`/api/notes/${id}`, { method: "DELETE" });
    return handleResponse<{ message: string }>(res);
  },

  async summarize(documentId?: string, documentText?: string) {
    const res = await fetchWithCredentials("/api/summarize", {
      method: "POST",
      body: JSON.stringify({ documentId, documentText }),
    });
    return handleResponse<{ summary: string; keyConcepts: string[] }>(res);
  },

  async notesChat(documentId: string, question: string) {
    const res = await fetchWithCredentials("/api/notes/chat", {
      method: "POST",
      body: JSON.stringify({ documentId, question }),
    });
    return handleResponse<{ answer: string; pageReferences: { documentTitle: string; snippet: string }[] }>(res);
  },

  // ── RAG ──────────────────────────────────────────────────────────────
  async askRag(question: string, courseFilter?: string) {
    const res = await fetchWithCredentials("/api/rag/ask", {
      method: "POST",
      body: JSON.stringify({ question, courseFilter }),
    });
    return handleResponse<{ answer: string; sources: { documentId: string; documentTitle: string; pageNumber?: number; relevantText?: string }[] }>(res);
  },

  // ── Writing ──────────────────────────────────────────────────────────
  async improveWriting(originalText: string) {
    const res = await fetchWithCredentials("/api/writing/improve", {
      method: "POST",
      body: JSON.stringify({ originalText }),
    });
    return handleResponse<{
      improvedText: string;
      suggestions: { type: "grammar" | "clarity" | "style"; original: string; improved: string; explanation: string; highlight?: string }[];
    }>(res);
  },

  // ── Quizzes ──────────────────────────────────────────────────────────
  async getQuizzes(admin = false) {
    const res = await fetchWithCredentials(`/api/quiz${admin ? "?admin=true" : ""}`);
    return handleResponse<{ id: string; title: string; description?: string; is_active: boolean; time_limit_minutes?: number; questions: number }[]>(res);
  },

  async getQuiz(id: string, admin = false) {
    const res = await fetchWithCredentials(`/api/quiz/${id}${admin ? "?admin=true" : ""}`);
    return handleResponse<{
      id: string;
      title: string;
      description?: string;
      time_limit_minutes?: number;
      questions: { id: string; question: string; options: string[]; correct?: number; optionIds: string[] }[];
    }>(res);
  },

  async updateQuiz(id: string, updates: { title?: string; description?: string; time_limit_minutes?: number; is_active?: boolean }) {
    const res = await fetchWithCredentials(`/api/quiz/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    return handleResponse(res);
  },

  async deleteQuiz(id: string) {
    const res = await fetchWithCredentials(`/api/quiz/${id}`, { method: "DELETE" });
    return handleResponse(res);
  },

  async getAttemptResult(attemptId: string) {
    const res = await fetchWithCredentials(`/api/quiz/attempts/${attemptId}`);
    return handleResponse<{
      attemptId: string;
      quizId: string;
      quizTitle: string;
      score: number;
      total: number;
      percentage: number;
      submittedAt: string | null;
      questions: {
        questionId: string;
        questionText: string;
        questionType: string;
        options: { id: string; text: string; isCorrect: boolean }[];
        userSelectedOptionId: string | null;
        userWrittenAnswer: string | null;
        correctOptionId: string | null;
        isCorrect: boolean;
      }[];
    }>(res);
  },

  async submitQuiz(id: string, answers: { questionId: string; selectedOptionId?: string | null; writtenAnswer?: string | null }[]) {
    const res = await fetchWithCredentials(`/api/quiz/${id}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
    return handleResponse<{ attemptId: string; score: number; total: number; percentage: number }>(res);
  },

  async generateQuiz(documentText: string, numQuestions = 10, questionType: "mcq" | "short" = "mcq") {
    const res = await fetchWithCredentials("/api/quiz/generate", {
      method: "POST",
      body: JSON.stringify({ documentText, numQuestions, questionType }),
    });
    return handleResponse<{ questions: { questionText: string; options: string[]; correctAnswer: string; type: string; order_index: number }[] }>(res);
  },

  async createQuiz(title: string, description?: string, time_limit_minutes?: number) {
    const res = await fetchWithCredentials("/api/quiz", {
      method: "POST",
      body: JSON.stringify({ title, description, time_limit_minutes, is_active: false }),
    });
    return handleResponse<{ id: string; title: string }>(res);
  },

  async addQuizQuestions(quizId: string, questions: { questionText: string; options?: string[]; correctAnswer?: string | number; type?: string }[]) {
    const res = await fetchWithCredentials(`/api/quiz/${quizId}/questions`, {
      method: "POST",
      body: JSON.stringify({ questions }),
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async deleteQuestion(quizId: string, questionId: string) {
    const res = await fetchWithCredentials(`/api/quiz/${quizId}/questions?questionId=${questionId}`, {
      method: "DELETE",
    });
    return handleResponse<{ message: string }>(res);
  },

  // ── Tasks ────────────────────────────────────────────────────────────
  async getTasks() {
    const res = await fetchWithCredentials("/api/tasks");
    return handleResponse<{ id: string; title: string; description?: string; due_date: string; priority: string; is_completed: boolean; reminder_time?: string }[]>(res);
  },

  async createTask(task: { title: string; description?: string; due_date: string; priority?: string }) {
    const res = await fetchWithCredentials("/api/tasks", {
      method: "POST",
      body: JSON.stringify(task),
    });
    return handleResponse<{ id: string; title: string }>(res);
  },

  async updateTask(id: string, updates: Partial<{ title: string; description: string; due_date: string; priority: string; is_completed: boolean }>) {
    const res = await fetchWithCredentials("/api/tasks", {
      method: "PUT",
      body: JSON.stringify({ id, ...updates }),
    });
    return handleResponse(res);
  },

  async deleteTask(id: string) {
    const res = await fetchWithCredentials(`/api/tasks?id=${id}`, { method: "DELETE" });
    return handleResponse(res);
  },

  // ── Admin ────────────────────────────────────────────────────────────
  async getAdminAnalytics() {
    const res = await fetchWithCredentials("/api/admin/analytics");
    return handleResponse<{ totalStudents: number; totalDocuments: number; activeQuizzes: number; ragDocumentsIndexed: number }>(res);
  },

  async getAdminUsers() {
    const res = await fetchWithCredentials("/api/admin/users");
    return handleResponse<{ id: string; email: string; name?: string; role: string; is_active?: boolean; created_at: string }[]>(res);
  },

  async toggleUserStatus(userId: string, isActive: boolean) {
    const res = await fetchWithCredentials("/api/admin/users", {
      method: "PATCH",
      body: JSON.stringify({ userId, is_active: isActive }),
    });
    return handleResponse<{ id: string; email: string; name?: string; role: string; is_active: boolean; created_at: string }>(res);
  },

  async getAdminRagDocuments() {
    const res = await fetchWithCredentials("/api/admin/rag/documents");
    return handleResponse<{ id: string; title: string; content_type?: string; department?: string; course?: string; uploaded_at: string; chunksCount: number }[]>(res);
  },

  async uploadRagDocument(file: File, title?: string, department?: string, course?: string) {
    const form = new FormData();
    form.append("file", file);
    if (title) form.append("title", title);
    if (department) form.append("department", department);
    if (course) form.append("course", course);
    const res = await fetch(`${API_URL}/api/admin/rag/upload`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    return handleResponse<{ status: string; documentId: string; chunksIndexed: number }>(res);
  },

  async sendAdminEmail(to: string, subject: string, body: string) {
    const res = await fetchWithCredentials("/api/admin/email", {
      method: "POST",
      body: JSON.stringify({ to, subject, body }),
    });
    return handleResponse<{ message: string }>(res);
  },
};

export default api;
