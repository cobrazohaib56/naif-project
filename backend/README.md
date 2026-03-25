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
     - `OLLAMA_BASE_URL=http://localhost:11434` (if using Ollama for LLM and embeddings)

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

## AI

- **Ollama (local):** Install [Ollama](https://ollama.ai), run `ollama pull llama3.2` and `ollama pull nomic-embed-text`. Set `OLLAMA_BASE_URL`.
- **RAG:** Admin uploads PDF/DOCX in the Admin → RAG Documents. Documents are chunked, embedded with nomic-embed-text (768 dimensions), and stored in `rag_chunks`. Students use Ask AI to query with similarity search. The `courseFilter` parameter in Ask AI filters results by document course/department.
- **Embedding dimension:** The schema uses `vector(768)` to match nomic-embed-text. If you use HuggingFace for embeddings, set `HUGGINGFACE_EMBEDDING_MODEL` to a model that outputs 768 dimensions, or add a migration to use `vector(384)` and set the dimension in `lib/embeddings.ts` to 384.
