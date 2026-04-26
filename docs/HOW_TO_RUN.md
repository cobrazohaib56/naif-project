# How to Run the AI Study Companion (Local Development)

Run the **backend first**, then the **frontend**. Both terminals must stay open.

---

## The "Cannot reach the backend" error (read this first)

This message means the browser could not connect to the backend server at all — it is a **network problem, not a code problem**. The three causes are:

1. **Backend is not running** — Start it with `npm run dev` inside the `backend/` folder (Step 2 below).
2. **Wrong port in frontend env** — `frontend/.env` must contain `VITE_API_URL=http://localhost:3001`.
3. **Wrong `NEXTAUTH_URL` in backend env** — Must be `http://localhost:3001` for local dev, not a Render/production URL.

CORS is already configured to allow every `localhost` origin. If you fix the three points above and the backend is actually running, the error disappears.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | `node -v` to check |
| npm | 9+ | bundled with Node |
| Supabase account | — | [supabase.com](https://supabase.com) — free tier is enough |
| GROQ API key | — | [console.groq.com/keys](https://console.groq.com/keys) — free |
| Jina AI API key | — | [jina.ai](https://jina.ai) — free (10 M tokens, no credit card) |

---

## Step 1 — Supabase one-time setup

1. Create a new Supabase project.
2. In **SQL Editor**, paste and run the entire file:
   `backend/supabase/migrations/001_initial_schema.sql`
3. In **Storage → New bucket**, create two **private** buckets:
   - `documents`
   - `rag`
4. In **Project Settings → API**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role (secret)** → `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2 — Backend

### 2.1 Install

```bash
cd backend
npm install
```

### 2.2 Create `backend/.env.local`

```bash
cp .env.example .env.local
```

Then edit `.env.local` and fill in every line marked **required**:

```env
# ── Database (required) ─────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres

# ── Auth (required) ──────────────────────────────────────────────────────────
# Generate secret: openssl rand -base64 32
NEXTAUTH_SECRET=paste-the-generated-secret-here
NEXTAUTH_URL=http://localhost:3001          # ← must be this exact value locally
FRONTEND_URL=http://localhost:5173          # ← must match where the frontend runs

# ── LLM — GROQ (required for all AI features) ───────────────────────────────
LLM_PROVIDER=groq
GROQ_API_KEY=gsk_...                       # from console.groq.com/keys (free)

# ── Embeddings — Jina AI (required for Ask AI + Smart Quiz) ─────────────────
EMBEDDING_PROVIDER=jina
JINA_API_KEY=jina_...                      # from jina.ai (free, no credit card)

# ── Email (optional — only needed for forgot-password) ──────────────────────
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx             # Gmail App Password, NOT your login password
```

> **NEXTAUTH_URL** must be `http://localhost:3001` when running locally.  
> If this is set to a Render/production URL, the session cookies will fail and login will be broken.

### 2.3 Start the backend

```bash
npm run dev
```

You should see:

```
▲ Next.js ... ready on http://localhost:3001
```

Leave this terminal open.

---

## Step 3 — Frontend

### 3.1 Install

```bash
cd frontend
npm install
```

### 3.2 Create `frontend/.env`

```bash
echo "VITE_API_URL=http://localhost:3001" > .env
```

Or create the file manually with that single line.

### 3.3 Start the frontend

```bash
npm run dev
```

Vite will print the URL (usually `http://localhost:5173`). Open it in the browser.

---

## Step 4 — First use

1. Open **http://localhost:5173**.
2. Click **Register** and create an account.
3. Log in — you will be taken to the Dashboard.
4. Every feature (Ask AI, Knowledge Base, Quiz Manager, Writing Coach, etc.) is available to every logged-in user.

---

## AI Features — what key does what

| Feature | Key required | Where to get it |
|---------|-------------|-----------------|
| Summarization (My Notes) | `GROQ_API_KEY` | [console.groq.com](https://console.groq.com/keys) |
| Writing Coach | `GROQ_API_KEY` | same |
| Quiz generation (Smart Quiz / Quiz Manager) | `GROQ_API_KEY` | same |
| Ask AI answers | `GROQ_API_KEY` | same |
| Ask AI document indexing | `JINA_API_KEY` | [jina.ai](https://jina.ai) |
| Smart Quiz (picks context from docs) | both keys | — |

All keys live in `backend/.env.local` — the browser never sees them.

---

## Troubleshooting

### "Cannot reach the backend" on login / register

Checklist in order:

- [ ] Is the backend running? Check the terminal — `npm run dev` should show `ready on http://localhost:3001`.
- [ ] Is `NEXTAUTH_URL=http://localhost:3001` in `backend/.env.local`? Not a Render URL.
- [ ] Is `VITE_API_URL=http://localhost:3001` in `frontend/.env`?
- [ ] Did you restart both servers after changing any `.env` file? Vite and Next.js do not hot-reload env changes.
- [ ] Open browser DevTools (F12) → **Network** tab → click the failing request → read the actual error response.

### "Embedding service unavailable" in Ask AI

- `JINA_API_KEY` is missing or wrong in `backend/.env.local`.
- Get a free key at [jina.ai](https://jina.ai) and paste it, then restart the backend.

### "AI could not generate a response" in quizzes / writing / summarization

- `GROQ_API_KEY` is missing or wrong in `backend/.env.local`.
- Get a free key at [console.groq.com/keys](https://console.groq.com/keys) and paste it, then restart the backend.

### Login succeeds but page is blank / redirect loops

- `NEXTAUTH_URL` is set to a production/Render URL. Change it to `http://localhost:3001` and restart the backend.

---

## Quick reference

| What | Folder | Command | Default URL |
|------|--------|---------|------------|
| Backend | `backend/` | `npm run dev` | http://localhost:3001 |
| Frontend | `frontend/` | `npm run dev` | http://localhost:5173 |
| Backend env | `backend/.env.local` | copy from `.env.example` | — |
| Frontend env | `frontend/.env` | `VITE_API_URL=http://localhost:3001` | — |
