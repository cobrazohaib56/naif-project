# AI Study Companion — Backend

Next.js 15 API + NextAuth + Supabase + AI/RAG for the UNITEN AI Study Companion.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Supabase**
   - Create a project at [supabase.com](https://supabase.com).
   - Run the SQL in `supabase/migrations/001_initial_schema.sql` in the SQL Editor (including the `match_rag_chunks` function and pgvector).
   - Create two storage buckets: `documents` (for student notes) and `rag` (for admin RAG documents). Set them to private; the backend uses the service role.
   - Copy the project URL and service role key.

3. **Environment**
   - Copy `.env.example` to `.env.local`.
   - Set:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `DATABASE_URL` (Supabase connection string if you use it)
     - `NEXTAUTH_SECRET` (e.g. `openssl rand -base64 32`)
     - `NEXTAUTH_URL=http://localhost:3001`
     - `FRONTEND_URL=http://localhost:5173`

4. **First admin user**
   - Register via the frontend with a UNITEN email, then in Supabase run:
     ```sql
     UPDATE users SET role = 'admin' WHERE email = 'your@uniten.edu.my';
     ```

5. **Run**
   ```bash
   npm run dev
   ```
   Backend runs at http://localhost:3001. Point the frontend `VITE_API_URL` to this URL.

## AI Provider

The backend supports two LLM providers, controlled by the `LLM_PROVIDER` env var:

| Provider | Env var | Model | Notes |
|----------|---------|-------|-------|
| **GROQ** (default) | `GROQ_API_KEY` | `llama-3.3-70b-versatile` | Fast inference, generous free tier |
| **Gemini** (fallback) | `GEMINI_API_KEY` | `gemini-2.0-flash-lite` | Set `LLM_PROVIDER=gemini` to use |

To switch: change `LLM_PROVIDER` in your env and restart. No code changes needed.

Optional model overrides: `GROQ_MODEL`, `GEMINI_MODEL`.

## RAG & Embeddings

The embedding provider is selectable via `EMBEDDING_PROVIDER`:

| Provider | Env var | Model | Notes |
|----------|---------|-------|-------|
| **Jina** (default) | `JINA_API_KEY` | `jina-embeddings-v3` @ 384 dim | Free 10M tokens on signup, reliable |
| **HuggingFace** (fallback) | `HUGGINGFACE_API_KEY` | `sentence-transformers/all-MiniLM-L6-v2` | Set `EMBEDDING_PROVIDER=huggingface` to use |

- Get a free Jina key at [jina.ai](https://jina.ai) — no credit card required.
- The DB schema uses `vector(384)` — both providers produce 384-dim vectors.
- Admin uploads PDF/DOCX via Admin → RAG Documents. Documents are chunked, embedded, and stored in `rag_chunks`.
- Students use Ask AI for similarity search over the indexed corpus.
- Quiz generation can use RAG documents as source material (via `ragDocumentId`).

## Email (SMTP)

Required for password reset and welcome emails:

- `SMTP_USER` — Gmail address
- `SMTP_PASS` — Gmail App Password (not your login password; see [Google guide](https://support.google.com/accounts/answer/185833))
- `FRONTEND_URL` — Used in password reset links (e.g. `http://localhost:5173`)
