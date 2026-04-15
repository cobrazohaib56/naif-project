# AI Study Companion — Complete Project Documentation

A full-stack academic platform that helps students upload notes, get AI-powered summaries, take quizzes, chat with documents, and manage their study schedule. Admins manage users, quizzes, and the institutional knowledge base.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Deployment](#deployment)
4. [Module 1 — Authentication](#module-1--authentication)
5. [Module 2 — Dashboard](#module-2--dashboard)
6. [Module 3 — Notes & Document AI](#module-3--notes--document-ai)
7. [Module 4 — Quiz System](#module-4--quiz-system)
8. [Module 5 — Ask AI (RAG Q&A)](#module-5--ask-ai-rag-qa)
9. [Module 6 — Writing Coach](#module-6--writing-coach)
10. [Module 7 — Schedule & Task Manager](#module-7--schedule--task-manager)
11. [Module 8 — User Profile & Settings](#module-8--user-profile--settings)
12. [Module 9 — Admin Panel](#module-9--admin-panel)
13. [Module 10 — Email System](#module-10--email-system)
14. [Database Schema](#database-schema)
15. [Potential Supervisor Questions & Answers](#potential-supervisor-questions--answers)

---

## Architecture Overview

The application follows a **decoupled client-server architecture**:

```
┌─────────────────────┐         HTTPS / JSON         ┌──────────────────────┐
│                     │  ◄──────────────────────────► │                      │
│   React Frontend    │       credentials: include    │   Next.js Backend    │
│   (Vite, port 5173) │                               │   (API, port 3001)   │
│                     │                               │                      │
└─────────────────────┘                               └──────────┬───────────┘
                                                                 │
                                                    ┌────────────┼────────────┐
                                                    │            │            │
                                                    ▼            ▼            ▼
                                               Supabase      Google       HuggingFace
                                              (Postgres +    Gemini API   Inference API
                                               Storage)      (LLM)       (Embeddings)
```

- **Frontend** — A single-page React app that handles all UI, routing, and state. Communicates with the backend exclusively through REST API calls.
- **Backend** — A Next.js API-only server. Every route under `/api/*` is a serverless-style handler. Handles authentication, database access, AI calls, file storage, and email.
- **Database** — PostgreSQL hosted on Supabase. Uses the `pgvector` extension for storing and searching document embeddings.
- **File Storage** — Supabase Storage buckets for uploaded documents.
- **AI Services** — Google Gemini for text generation (summaries, chat, quiz generation, writing improvement). HuggingFace for vector embeddings used in RAG search.

### How a request flows

1. User interacts with the React UI.
2. Frontend calls `fetchWithCredentials()` which sends a JSON request to the backend with session cookies.
3. Backend route calls `requireAuth()` to verify the JWT session.
4. Route performs database queries, AI calls, or storage operations.
5. JSON response is returned to the frontend.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend Framework** | React 18 + TypeScript | Component-based UI with type safety |
| **Build Tool** | Vite | Fast dev server and optimized production builds |
| **Styling** | TailwindCSS + shadcn/ui | Utility-first CSS with pre-built accessible components |
| **Client State** | React Context (Auth) + TanStack React Query (server state) | Auth context for global user state; React Query for caching, refetching, and mutations |
| **Backend Framework** | Next.js 15 (API Routes only) | File-based API routing with built-in TypeScript support |
| **Authentication** | NextAuth v5 (Auth.js) | JWT sessions with credentials provider; 30-day session lifetime |
| **Database** | PostgreSQL on Supabase | Managed Postgres with built-in REST client, Row Level Security, and pgvector |
| **Vector Search** | pgvector extension | Cosine similarity search on 384-dimensional embeddings for RAG |
| **AI / LLM** | Google Gemini API (gemini-2.0-flash-lite) | Text generation for summaries, document chat, quiz generation, and writing improvement |
| **Embeddings** | HuggingFace Inference API (all-MiniLM-L6-v2) | 384-dim sentence embeddings for RAG document indexing and search |
| **File Storage** | Supabase Storage | Stores uploaded PDFs, DOCX, and TXT files with signed URL access |
| **Email** | Nodemailer + Gmail SMTP | Sends welcome, password reset, and admin emails |
| **Validation** | Zod | Runtime schema validation on all API inputs |
| **Password Hashing** | bcryptjs | Industry-standard password hashing with salt rounds |
| **Text Extraction** | pdf-parse + mammoth | Extract text from PDF and DOCX files server-side |
| **Deployment** | Render | Backend as a web service, frontend as a static site |

---

## Deployment

| Service | Platform | Type | URL Pattern |
|---------|----------|------|-------------|
| Backend | Render | Web Service | `https://naif-backend.onrender.com` |
| Frontend | Render | Static Site | `https://naif-frontend.onrender.com` |
| Database | Supabase | Managed PostgreSQL | Supabase project dashboard |
| File Storage | Supabase | Storage Buckets | Accessed via signed URLs |

### Environment Variables (Backend)

| Variable | Purpose |
|----------|---------|
| `NEXTAUTH_URL` | Backend URL for NextAuth |
| `NEXTAUTH_SECRET` | Secret key for JWT signing |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) |
| `GEMINI_API_KEY` | Google AI Studio API key for Gemini |
| `HUGGINGFACE_API_KEY` | HuggingFace API key for embeddings |
| `SMTP_USER` | Gmail address for sending emails |
| `SMTP_PASS` | Gmail App Password |
| `FRONTEND_URL` | Frontend URL (used in password reset links) |

### Environment Variables (Frontend)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend API base URL |

### Build & Deploy Commands

- **Backend:** `npm install && npm run build` → `npm start`
- **Frontend:** `npm install && npm run build` → serves `dist/` as static files

---

## Module 1 — Authentication

Handles user registration, login, password reset, and session management.

### User Roles

| Role | Access |
|------|--------|
| **Student** | Default role. Access to notes, quizzes, AI tools, schedule, settings. |
| **Admin** | Everything a student has, plus admin panel (user management, quiz management, RAG documents, email). |

### How it works

- **Registration** — User submits email + password. Backend hashes the password with bcrypt, inserts a new `student` row, and sends a welcome email.
- **Login** — NextAuth credentials provider queries the `users` table, verifies the bcrypt hash, checks `is_active`, and issues a JWT cookie.
- **Session** — JWT stored in an HTTP-only cookie. Contains `user.id` and `user.role`. Valid for 30 days.
- **Password Reset** — Generates a cryptographic token, stores it in `password_reset_tokens` (expires in 1 hour), and emails a reset link.

### Key Backend Code

**Password hashing and user creation** (`backend/app/api/auth/register/route.ts`):
```typescript
const password_hash = await bcrypt.hash(password, 10);

const { data: user, error } = await supabase
  .from("users")
  .insert({ email: normalizedEmail, password_hash, role: "student", name })
  .select("id, email, role, name")
  .single();
```

**Login verification** (`backend/auth.ts` — NextAuth authorize):
```typescript
async authorize(credentials) {
  const { data: user } = await supabase
    .from("users")
    .select("id, email, password_hash, role, name, is_active")
    .eq("email", email)
    .single();

  if (!user || user.is_active === false) return null;
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
```

**Auth guard used by all protected routes** (`backend/lib/auth.ts`):
```typescript
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  return session;
}

export function requireAdmin(session) {
  if (session.user?.role !== "admin") {
    throw new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }
}
```

### Key Frontend Code

**Auth context** (`frontend/src/contexts/AuthContext.tsx`):
```typescript
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const refetch = useCallback(async () => {
    const data = await api.getSession();
    setUser(data?.user ?? null);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const signOut = useCallback(async () => {
    await api.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refetch, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/callback/credentials` | Login (NextAuth) |
| GET | `/api/auth/session` | Get current session |
| POST | `/api/auth/signout` | Sign out |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |

---

## Module 2 — Dashboard

The landing page after login. Displays an overview of the student's activity.

### What it shows

- Total number of uploaded notes
- Number of available quizzes
- Upcoming tasks from the schedule
- Quick-action links to Notes, Quizzes, and Schedule

### Frontend Route

| Path | Component |
|------|-----------|
| `/` | `Dashboard.tsx` |

---

## Module 3 — Notes & Document AI

The core study feature. Students upload documents and use AI to summarize, extract key concepts, and chat with the content.

### User Flow

1. **Upload** a PDF, DOCX, or TXT file (max 20 MB).
2. Server extracts text from the file automatically.
3. **View** the document with an embedded preview.
4. **Summarize** — AI generates a summary and extracts key concepts.
5. **Chat** — Ask questions about the document, answered using only the document's content.
6. **Delete** — Remove the note, its file, and all generated summaries.

### Key Backend Code

**File upload with text extraction** (`backend/app/api/notes/upload/route.ts`):
```typescript
const buffer = Buffer.from(await file.arrayBuffer());
const path = `notes/${userId}/${docRow.id}.${ext}`;

await supabase.storage.from("documents").upload(path, buffer, {
  contentType: mime,
  upsert: true,
});

let extracted_text = null;
try {
  extracted_text = await extractTextFromBuffer(buffer, mime, safeName);
} catch {
  // leave null if extraction fails
}

if (extracted_text) {
  await supabase.from("documents").update({ extracted_text }).eq("id", docRow.id);
}
```

**Text extraction from different file types** (`backend/lib/extract-text.ts`):
```typescript
export async function extractTextFromBuffer(buffer, mimeType, fileName) {
  if (mimeType === "application/pdf") {
    const data = await pdf(buffer);
    return data.text;
  }
  if (mimeType.includes("wordprocessingml.document")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (mimeType === "text/plain") {
    return buffer.toString("utf-8");
  }
  throw new Error("Unsupported file type");
}
```

**Document chat** (`backend/app/api/notes/chat/route.ts`):
```typescript
const context = doc.extracted_text.slice(0, 12000);
const answer = await callLlm(DOC_CHAT_PROMPT(context), `Question: ${question}`);

return NextResponse.json({
  answer: answer.trim(),
  pageReferences: [{ documentTitle: doc.file_name, snippet: context.slice(0, 300) }],
});
```

### Key Frontend Code

**Chat with document** (`frontend/src/pages/NoteDetail.tsx`):
```typescript
const handleAskDocument = async () => {
  const question = chatInput.trim();
  setChatHistory((prev) => [...prev, { role: "user", content: question }]);

  const res = await api.notesChat(id, question);
  setChatHistory((prev) => [
    ...prev,
    { role: "ai", content: res.answer, pageRef: res.pageReferences?.[0]?.documentTitle },
  ]);
};
```

**Upload flow** (`frontend/src/pages/Notes.tsx`):
```typescript
const uploadMutation = useMutation({
  mutationFn: (file: File) => api.uploadNote(file),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["notes"] });
    toast.success("Note uploaded successfully");
  },
});
```

### API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/notes` | List all user notes |
| POST | `/api/notes/upload` | Upload a file |
| GET | `/api/notes/:id` | Get note detail + summary |
| DELETE | `/api/notes/:id` | Delete note, file, and summaries |
| POST | `/api/summarize` | Generate AI summary |
| POST | `/api/notes/chat` | Chat with a document |

---

## Module 4 — Quiz System

Admins create quizzes; students take them and review results.

### Student Flow

1. Browse active quizzes on the Quiz Zone page.
2. Start a quiz — answer multiple-choice questions one at a time.
3. Submit and see score + correct/incorrect breakdown.

### Admin Flow

1. Create a quiz with title, description, and optional time limit.
2. Add questions manually (4 options, mark the correct one).
3. Or use AI — paste source text, AI generates MCQ questions, preview, then save.
4. Delete individual questions or entire quizzes.
5. Toggle quizzes active/inactive (inactive quizzes are hidden from students).

### Key Backend Code

**AI quiz generation** (`backend/app/api/quiz/generate/route.ts`):
```typescript
const prompt = QUIZ_GENERATE_PROMPT(numQuestions, questionType);
const response = await callLlm(prompt, text);

const jsonMatch = response.match(/\{[\s\S]*\}/);
const data = JSON.parse(jsonMatch[0]);

const questions = data.questions.map((q, i) => ({
  questionText: q.question,
  options: q.options ?? [],
  correctAnswer: q.correctAnswer ?? q.answer ?? "",
  type: questionType,
  order_index: i,
}));
```

**Quiz creation** (`backend/app/api/quiz/route.ts`):
```typescript
export async function POST(request) {
  const session = await requireAuth();
  requireAdmin(session);

  const { data: quiz } = await supabase
    .from("quizzes")
    .insert({ admin_id: adminId, title, description, time_limit_minutes, is_active })
    .select("id, title, description, is_active, time_limit_minutes")
    .single();
}
```

### Key Frontend Code

**Quiz submission** (`frontend/src/pages/QuizPlay.tsx`):
```typescript
const submitMutation = useMutation({
  mutationFn: (answers) => api.submitQuiz(id, answers),
  onSuccess: (data) => {
    navigate(`/quizzes/${id}/results`, {
      state: { score: data.score, total: data.total, attemptId: data.attemptId },
    });
  },
});
```

**Admin: Add manual question** (`frontend/src/pages/admin/AdminQuiz.tsx`):
```typescript
const handleAddManualQuestion = () => {
  addQuestionsMutation.mutate({
    quizId: managingQuizId,
    questions: [{
      questionText: manualQuestion.trim(),
      options: manualOptions.filter((o) => o.trim()),
      correctAnswer: manualCorrect,
      type: "mcq",
    }],
  });
};
```

### API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/quiz` | List quizzes (active only for students) |
| POST | `/api/quiz` | Create quiz (admin) |
| GET | `/api/quiz/:id` | Get quiz with questions |
| PUT | `/api/quiz/:id` | Update quiz (admin) |
| DELETE | `/api/quiz/:id` | Delete quiz (admin) |
| POST | `/api/quiz/:id/questions` | Add questions (admin) |
| DELETE | `/api/quiz/:id/questions?questionId=` | Delete a question (admin) |
| POST | `/api/quiz/generate` | AI-generate questions (admin) |
| POST | `/api/quiz/:id/submit` | Submit quiz attempt (student) |
| GET | `/api/quiz/attempts/:attemptId` | View attempt results |

---

## Module 5 — Ask AI (RAG Q&A)

A chat interface where students ask academic questions. Answers come from documents that admins have uploaded and indexed into the knowledge base (Retrieval-Augmented Generation).

### How RAG Works

1. **Admin uploads** a document → backend extracts text, splits it into chunks, generates 384-dim embeddings via HuggingFace, and stores them in the `rag_chunks` table with pgvector.
2. **Student asks a question** → backend embeds the question, runs a cosine similarity search (`match_rag_chunks`), retrieves the top relevant chunks, builds a context string, and sends it to Gemini with the question.
3. Gemini answers using **only** the retrieved context, with source citations.

### Key Backend Code

**Embedding text** (`backend/lib/embeddings.ts`):
```typescript
async function embedHuggingFace(text) {
  const res = await fetch(
    `https://api-inference.huggingface.co/models/${HF_EMBED_MODEL}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${HF_API_KEY}` },
      body: JSON.stringify({ inputs: text.slice(0, 8000), options: { wait_for_model: true } }),
    }
  );
  return await res.json();
}
```

**RAG search and answer** (`backend/app/api/rag/ask/route.ts`):
```typescript
const embedding = await embedText(question);
const { data: chunks } = await supabase.rpc("match_rag_chunks", {
  query_embedding: `[${embedding.join(",")}]`,
  match_count: 15,
});

const context = topChunks.map((c) => {
  const title = docTitles.get(c.rag_document_id);
  return `[${title}, Page ${c.metadata?.page}]\n${c.chunk_text}`;
}).join("\n\n");

const answer = await callLlm(RAG_ANSWER_PROMPT(context), question);
```

**Vector similarity search** (SQL function in database):
```sql
CREATE FUNCTION match_rag_chunks(query_embedding vector(384), match_count int)
RETURNS TABLE (id uuid, rag_document_id uuid, chunk_text text, metadata jsonb, similarity float)
AS $$
  SELECT *, 1 - (embedding <=> query_embedding) AS similarity
  FROM rag_chunks
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### Key Frontend Code

**Ask AI chat** (`frontend/src/pages/AskAI.tsx`):
```typescript
const askMutation = useMutation({
  mutationFn: (question) => api.askRag(question),
  onSuccess: (data, question) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "ai", content: data.answer, source: data.sources?.[0] },
    ]);
  },
});
```

### API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/rag/ask` | Ask a question against the RAG knowledge base |
| POST | `/api/admin/rag/upload` | Upload and index a RAG document (admin) |
| GET | `/api/admin/rag/documents` | List indexed RAG documents (admin) |

---

## Module 6 — Writing Coach

Students paste text and the AI improves it for grammar, clarity, and academic tone.

### Key Backend Code

**Writing improvement** (`backend/app/api/writing/improve/route.ts`):
```typescript
const response = await callLlm(WRITING_IMPROVE_PROMPT, originalText);
const parsed = JSON.parse(response);
// Returns: { improvedText: "...", suggestions: [{ type, original, improved, explanation }] }
```

### Key Frontend Code

**Analyze and improve** (`frontend/src/pages/WritingCoach.tsx`):
```typescript
const improveMutation = useMutation({
  mutationFn: (originalText) => api.improveWriting(originalText),
  onSuccess: (data) => {
    setSuggestions(data.suggestions.map((s) => ({
      type: s.type,
      highlight: s.original,
      explanation: s.explanation,
    })));
    setImprovedText(data.improvedText);
  },
});
```

### API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/writing/improve` | Improve text with AI suggestions |

---

## Module 7 — Schedule & Task Manager

Students create and manage tasks with due dates, priorities, and completion tracking.

### Features

- Create tasks with title, due date, and priority (low / medium / high).
- Mark tasks as completed.
- Tasks appear on the Dashboard as upcoming reminders.
- Due-date notifications via the `useTaskNotifications` hook.

### Key Backend Code

**Task CRUD** (`backend/app/api/tasks/route.ts`):
```typescript
// GET — list tasks
const { data: tasks } = await supabase
  .from("tasks")
  .select("id, title, description, due_date, priority, is_completed")
  .eq("user_id", userId)
  .order("due_date");

// POST — create task
const { data: task } = await supabase
  .from("tasks")
  .insert({ user_id: userId, title, due_date, priority, description })
  .select()
  .single();
```

### Key Frontend Code

**Task creation** (`frontend/src/pages/Schedule.tsx`):
```typescript
const createMutation = useMutation({
  mutationFn: () => api.createTask({ title, due_date: dueDate, priority }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    toast.success("Task added");
  },
});
```

### API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/tasks` | List user's tasks |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks` | Update a task |
| DELETE | `/api/tasks?id=` | Delete a task |

---

## Module 8 — User Profile & Settings

Users view and update their profile information.

### Features

- View email, name, role, and account creation date.
- Update display name.
- Link to password reset flow.

### API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/user/profile` | Get profile data |
| PUT | `/api/user/profile` | Update name |

---

## Module 9 — Admin Panel

Admin-only pages for managing the platform.

### 9a. Admin Dashboard

High-level statistics:
- Total students
- Total uploaded documents
- Active quizzes
- Indexed RAG documents

### 9b. User Management

- View all student accounts (email, name, active status, join date).
- Enable or disable student accounts (disabled students cannot sign in).
- Send custom emails to any student.

**Key code** (`frontend/src/pages/admin/AdminUsers.tsx`):
```typescript
const toggleMutation = useMutation({
  mutationFn: ({ userId, isActive }) => api.toggleUserStatus(userId, isActive),
  onSuccess: (_, { isActive }) => {
    toast.success(isActive ? "User enabled" : "User disabled");
  },
});
```

### 9c. Quiz Manager

Full quiz CRUD with question management and AI generation. See [Module 4](#module-4--quiz-system) for details.

### 9d. RAG Document Management

Upload and index documents for the institutional knowledge base. See [Module 5](#module-5--ask-ai-rag-qa) for details.

### Admin API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/admin/analytics` | Dashboard statistics |
| GET | `/api/admin/users` | List students |
| PATCH | `/api/admin/users` | Enable/disable a student |
| POST | `/api/admin/email` | Send custom email |
| POST | `/api/admin/email/test` | Test SMTP configuration |
| POST | `/api/admin/rag/upload` | Upload RAG document |
| GET | `/api/admin/rag/documents` | List RAG documents |

---

## Module 10 — Email System

Automated and admin-triggered emails via Gmail SMTP.

### Email Types

| Email | When it's sent | Recipient |
|-------|---------------|-----------|
| Welcome email | After registration | New user |
| Password reset link | Forgot password request | User |
| Password changed | After successful reset | User |
| Custom email | Admin sends from User Management | Any student |

### Key Backend Code

**SMTP transporter** (`backend/lib/email.ts`):
```typescript
function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) return null;

  _transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,  // STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });
  return _transporter;
}

async function sendMail(to, subject, html) {
  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: `"AI Study Companion" <${SMTP_USER}>`,
    to, subject, html,
  });
  return true;
}
```

---

## Database Schema

The PostgreSQL database has the following tables:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User accounts | `id`, `email`, `password_hash`, `role`, `name`, `is_active` |
| `password_reset_tokens` | Password reset flow | `user_id`, `token`, `expires_at`, `used` |
| `documents` | Uploaded study notes | `user_id`, `file_name`, `file_path`, `extracted_text` |
| `summaries` | AI-generated summaries | `document_id`, `summary_text`, `key_concepts` |
| `quizzes` | Quiz metadata | `admin_id`, `title`, `is_active`, `time_limit_minutes` |
| `questions` | Quiz questions | `quiz_id`, `question_text`, `question_type`, `order_index` |
| `options` | MCQ answer options | `question_id`, `option_text`, `is_correct` |
| `quiz_attempts` | Student quiz submissions | `user_id`, `quiz_id`, `score`, `submitted_at` |
| `answers` | Per-question answers | `attempt_id`, `question_id`, `selected_option_id` |
| `tasks` | Student schedule/tasks | `user_id`, `title`, `due_date`, `priority`, `is_completed` |
| `writing_sessions` | Writing improvement history | `user_id`, `original_text`, `improved_text` |
| `rag_documents` | Admin-uploaded knowledge base docs | `admin_id`, `title`, `department`, `course` |
| `rag_chunks` | Embedded text chunks for RAG | `rag_document_id`, `chunk_text`, `embedding vector(384)` |

### Key Database Function

```sql
-- Cosine similarity search for RAG
CREATE FUNCTION match_rag_chunks(query_embedding vector(384), match_count int)
RETURNS TABLE (id uuid, chunk_text text, similarity float)
AS $$
  SELECT id, chunk_text, 1 - (embedding <=> query_embedding) AS similarity
  FROM rag_chunks
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

---

## Frontend Routing

### Public Routes (no login required)

| Path | Page |
|------|------|
| `/login` | Login |
| `/register` | Registration |
| `/forgot-password` | Forgot Password |
| `/reset-password` | Reset Password |

### Protected Routes (login required)

| Path | Page | Role |
|------|------|------|
| `/` | Dashboard | All |
| `/notes` | My Notes | All |
| `/notes/:id` | Note Detail | All |
| `/quizzes` | Quiz Zone | All |
| `/quizzes/:id/play` | Take Quiz | All |
| `/quizzes/:id/results` | Quiz Results | All |
| `/ask-ai` | Ask AI (RAG) | All |
| `/writing-coach` | Writing Coach | All |
| `/schedule` | Schedule | All |
| `/settings` | Settings | All |
| `/admin` | Admin Dashboard | Admin only |
| `/admin/documents` | RAG Documents | Admin only |
| `/admin/quiz` | Quiz Manager | Admin only |
| `/admin/users` | User Management | Admin only |

### Route protection code (`frontend/src/App.tsx`):
```typescript
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  <Route path="/forgot-password" element={<ForgotPassword />} />
  <Route path="/reset-password" element={<ResetPassword />} />
  <Route path="/*" element={
    <ProtectedRoute>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/notes" element={<Notes />} />
        {/* ... student routes ... */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/quiz" element={<AdminRoute><AdminQuiz /></AdminRoute>} />
        {/* ... admin routes ... */}
      </Routes>
    </ProtectedRoute>
  } />
</Routes>
```

---

## Sidebar Navigation

**Student sidebar:**
Dashboard · My Notes · Quiz Zone · Ask AI · Writing Coach · Schedule · Settings

**Admin sidebar (additional):**
Admin Dashboard · RAG Documents · Quiz Manager · User Management

Defined in `frontend/src/components/AppSidebar.tsx`:
```typescript
const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Notes", url: "/notes", icon: FileText },
  { title: "Quiz Zone", url: "/quizzes", icon: Brain },
  { title: "Ask AI", url: "/ask-ai", icon: MessageSquare },
  { title: "Writing Coach", url: "/writing-coach", icon: PenTool },
  { title: "Schedule", url: "/schedule", icon: CalendarDays },
  { title: "Settings", url: "/settings", icon: Settings },
];

const adminNavItems = [
  { title: "Admin Dashboard", url: "/admin", icon: BarChart3 },
  { title: "RAG Documents", url: "/admin/documents", icon: FolderOpen },
  { title: "Quiz Manager", url: "/admin/quiz", icon: Brain },
  { title: "User Management", url: "/admin/users", icon: Users },
];
```

---

## Potential Supervisor Questions & Answers

### Architecture & Design

**Q: Why did you separate the frontend and backend into two different projects instead of using a single Next.js full-stack app?**

A: We deliberately decoupled them for independent deployment and scaling. The frontend is a static site served from a CDN (Render Static Site), which is faster and cheaper. The backend is an API server that can be scaled independently. This also lets the frontend and backend have different release cycles and makes it easier to swap either one in the future.

**Q: Why Next.js for the backend if you're only using API routes?**

A: Next.js gives us file-based routing out of the box — each file in `app/api/` becomes an endpoint automatically. It handles TypeScript, bundling, and middleware natively. It also integrates seamlessly with NextAuth for authentication. We don't use any of the Next.js page rendering features — purely the API layer.

**Q: How does authentication work across the frontend and backend?**

A: NextAuth issues a JWT token stored in an HTTP-only cookie. The frontend sends `credentials: "include"` on every fetch request, which automatically attaches the cookie. The backend verifies the JWT on each request using the `requireAuth()` helper. The JWT contains the user's ID and role, so we don't need extra database lookups for authorization on every request.

**Q: Why JWT instead of database sessions?**

A: JWTs are stateless — the server doesn't need to look up a session store on every request. This is faster, simpler to deploy (no Redis or session table needed), and works well across multiple server instances. The tradeoff is that tokens can't be individually revoked before expiry, but for a study app with 30-day sessions, this is acceptable.

---

### Database & Storage

**Q: Why Supabase instead of a standalone PostgreSQL database?**

A: Supabase gives us managed Postgres plus built-in features we use: a JavaScript client with automatic query building, a Storage service for file uploads with signed URLs, and the pgvector extension pre-installed for RAG embeddings. It reduced the infrastructure we needed to set up from scratch.

**Q: What is pgvector and why do you use it?**

A: pgvector is a PostgreSQL extension that adds a `vector` data type and operators for similarity search. We store 384-dimensional embeddings alongside each text chunk in the `rag_chunks` table. When a student asks a question, we embed it and use cosine similarity (`<=>` operator) to find the most relevant chunks. This keeps everything in one database instead of needing a separate vector store like Pinecone.

**Q: How does Row Level Security (RLS) work in your app?**

A: RLS is enabled on all tables, but our backend uses the Supabase service role key which bypasses RLS. We enforce access control in application code — the `requireAuth()` and `requireAdmin()` helpers verify the user's identity and role, and every query filters by `user_id` to ensure users can only access their own data.

---

### AI & RAG

**Q: Explain how the RAG (Retrieval-Augmented Generation) pipeline works step by step.**

A: Step 1 — Admin uploads a document. The backend extracts text, splits it into chunks (~500 words each), generates a 384-dim vector embedding for each chunk using HuggingFace's all-MiniLM-L6-v2 model, and stores both the text and embedding in the `rag_chunks` table. Step 2 — Student asks a question. The backend embeds the question using the same model, runs a cosine similarity search via pgvector to find the top 5 most relevant chunks, builds a context string from those chunks, and sends it to Gemini with instructions to answer using only the provided context and cite sources. Step 3 — Gemini generates an answer grounded in the retrieved documents.

**Q: Why do you use HuggingFace for embeddings and Gemini for text generation? Why not one provider for both?**

A: We use HuggingFace's all-MiniLM-L6-v2 specifically because it produces 384-dimensional vectors that match our database schema (`vector(384)`). Switching to Gemini embeddings would produce different dimensions, requiring a database migration and re-embedding all existing documents. Gemini is used for generation because it provides a generous free tier and high-quality text output suitable for academic content.

**Q: How is document chat different from RAG Q&A?**

A: Document chat operates on a single document — it takes the first 12,000 characters of the document's extracted text and sends it directly to Gemini as context. RAG Q&A operates across the entire indexed knowledge base — it uses vector similarity search to find relevant chunks from any document, then generates an answer with source citations. Document chat is personal (student's own notes), while RAG Q&A is institutional (admin-curated knowledge base).

---

### Security

**Q: How do you handle password security?**

A: Passwords are never stored in plain text. We use bcrypt with 10 salt rounds to hash passwords before storing them. During login, bcrypt's `compare()` function verifies the password against the stored hash. Password reset tokens are 32-byte cryptographically random hex strings with a 1-hour expiry and single-use enforcement.

**Q: How do you prevent unauthorized access to admin features?**

A: Three layers: (1) Frontend — admin routes are wrapped in an `AdminRoute` component that checks `user.role === "admin"` and redirects otherwise. (2) Backend — every admin API route calls `requireAdmin(session)` which throws a 403 if the role isn't admin. (3) Database — the role is stored in the `users` table and embedded in the JWT, so it can't be modified client-side.

**Q: How do you prevent a student from accessing another student's data?**

A: Every database query includes a `user_id` filter. For example, when listing notes: `.eq("user_id", userId)`. The `userId` comes from the verified JWT session, not from the request body, so a user cannot forge another user's ID.

---

### Frontend

**Q: Why TanStack React Query instead of plain `useEffect` + `useState`?**

A: React Query handles caching, automatic refetching, loading/error states, and cache invalidation out of the box. When a student uploads a note, we call `queryClient.invalidateQueries({ queryKey: ["notes"] })` and the notes list automatically refreshes. Without React Query, we'd need manual state management, loading flags, and error handling for every API call.

**Q: How does the frontend communicate with the backend?**

A: Through a centralized API client in `frontend/src/lib/api.ts`. Every method calls `fetchWithCredentials()` which wraps the native `fetch()` with the backend URL, JSON headers, and `credentials: "include"` for cookie-based auth. A shared `handleResponse()` function parses responses and throws errors on non-200 status codes.

---

### Deployment & DevOps

**Q: How is the application deployed?**

A: Both services are deployed on Render. The backend runs as a Web Service (Node.js runtime) — Render runs `npm install && npm run build` then `npm start`. The frontend runs as a Static Site — Render builds it with Vite and serves the `dist/` folder. Environment variables (API keys, database credentials, SMTP settings) are configured in the Render dashboard and injected at runtime.

**Q: How do frontend and backend communicate in production?**

A: The frontend's `VITE_API_URL` environment variable points to the backend's Render URL. All API calls go to that URL with `credentials: "include"` for cross-origin cookie auth. The backend's CORS configuration allows the frontend's origin. NextAuth cookies are configured with `SameSite: none` and `Secure: true` for cross-site operation.

**Q: What happens when you push code to GitHub?**

A: Render watches the GitHub repository. When new commits are pushed to the main branch, Render automatically triggers a build and deploy for both the frontend and backend services. Zero-downtime deployment — the new version starts receiving traffic only after the build succeeds.
