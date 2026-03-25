# How to Run the AI Study Companion (Frontend & Backend)

Run the **backend** first, then the **frontend**. Both must be running for the app to work.

---

## Prerequisites

- **Node.js** 20+ (or Bun)
- **npm** (or pnpm / yarn)
- A **Supabase** project (for database and storage)
- (Optional) **Ollama** for local LLM and embeddings

---

## 1. Backend (Next.js API)

### 1.1 Install dependencies

```bash
cd pixel-perfect-backend
npm install
```

### 1.2 Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase **SQL Editor**, run the entire contents of:
   - `pixel-perfect-backend/supabase/migrations/001_initial_schema.sql`
3. In **Storage**, create two **private** buckets:
   - `documents` (for student notes)
   - `rag` (for admin RAG documents)
4. Copy your project **URL** and **service role key** from Project Settings → API.

### 1.3 Environment variables

```bash
cd pixel-perfect-backend
cp .env.example .env.local
```

Edit `.env.local` and set at least:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |
| `DATABASE_URL` | PostgreSQL connection string (if needed) | `postgresql://postgres:...@db.xxx.supabase.co:5432/postgres` |
| `NEXTAUTH_SECRET` | Random secret for sessions | Run: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Backend URL (for auth callbacks) | `http://localhost:3001` |
| `FRONTEND_URL` | Frontend URL (for CORS) | `http://localhost:5173` |
| `OLLAMA_BASE_URL` | (Optional) Ollama for LLM/embeddings | `http://localhost:11434` |

For **HuggingFace** instead of Ollama, set:

- `HUGGINGFACE_API_KEY`
- Optionally `HUGGINGFACE_LLM_MODEL` and `HUGGINGFACE_EMBEDDING_MODEL` (embedding model must output 768 dimensions to match the DB, or you need a 384-d migration).

### 1.4 Run the backend

```bash
npm run dev
```

Backend runs at **http://localhost:3001**.

### 1.5 First admin user

1. Register a user from the frontend (see below) using a UNITEN email (e.g. `you@uniten.edu.my`).
2. In Supabase **SQL Editor** run:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'you@uniten.edu.my';
   ```
3. Log in again; you should be redirected to the admin dashboard.

---

## 2. Frontend (Vite + React)

### 2.1 Install dependencies

```bash
cd pixel-perfect-frontend
npm install
```

### 2.2 Environment variables

Create or edit `.env` in the **pixel-perfect-frontend** folder:

```env
VITE_API_URL=http://localhost:3001
```

This must point to the backend URL (same as `NEXTAUTH_URL` when running locally).

### 2.3 Run the frontend

```bash
npm run dev
```

Frontend runs at **http://localhost:5173** (or the port Vite prints).

---

## 3. Using the app

1. Open **http://localhost:5173** in the browser.
2. **Register** with a UNITEN email (`@uniten.edu.my`) and a password (min 8 characters).
3. **Log in** with the same credentials.
4. Students are redirected to the **Dashboard**; admins (after the SQL update above) are redirected to the **Admin** dashboard.
5. Use the sidebar to open Notes, Quizzes, Ask AI, Writing Coach, Schedule, and (for admin) Admin sections.

---

## 4. Optional: Ollama (local AI)

For summarization, writing improvement, quiz generation, and RAG answers without HuggingFace:

1. Install [Ollama](https://ollama.ai).
2. Run:
   ```bash
   ollama pull llama3.2
   ollama pull nomic-embed-text
   ```
3. Ensure `OLLAMA_BASE_URL=http://localhost:11434` in the backend `.env.local`.

---

## 5. Build for production

**Backend:**

```bash
cd pixel-perfect-backend
npm run build
npm run start
```

**Frontend:**

```bash
cd pixel-perfect-frontend
npm run build
```

Then serve the `dist` folder with any static host. Set `VITE_API_URL` to your production backend URL before building.

---

## Troubleshooting: "Failed to fetch" on login or signup

If the app shows **"Failed to fetch"** (or the longer message about not reaching the backend) when you **Register** or **Sign in**:

1. **Backend must be running** – In a terminal, from `pixel-perfect-backend` run `npm run dev`. You should see it listening on **http://localhost:3001**.
2. **Restart the backend** after any CORS or env changes – The backend allows any `http://localhost:*` or `http://127.0.0.1:*` origin; a restart ensures the latest middleware is active.
3. **Frontend env** – In `pixel-perfect-frontend/.env` set `VITE_API_URL=http://localhost:3001`. Restart the frontend (`npm run dev`) after changing `.env`.
4. **Check the browser** – Open DevTools (F12) → **Console** for CORS or network errors; **Network** tab → click the failed request (e.g. `register` or `credentials`) to see status and response.

If you run the frontend on a different port (e.g. 8080), that is fine; CORS is configured to allow any localhost origin.

---

## Quick reference

| What | Where | Command |
|------|--------|---------|
| Backend root | `pixel-perfect-backend` | `npm run dev` |
| Frontend root | `pixel-perfect-frontend` | `npm run dev` |
| Backend URL | — | http://localhost:3001 |
| Frontend URL | — | http://localhost:5173 |
| Backend env | `pixel-perfect-backend/.env.local` | Copy from `.env.example` |
| Frontend env | `pixel-perfect-frontend/.env` | `VITE_API_URL=http://localhost:3001` |
