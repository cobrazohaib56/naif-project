# AI Study Companion for UNITEN Students

Full-stack FYP project: Vite/React frontend + Next.js API backend, Supabase, and AI (LLM + RAG).

**Structure:** Backend lives at **`pixel-perfect-backend/`** (project root). Frontend at **`pixel-perfect-frontend/`**. They are siblings—do not put the backend inside the frontend folder. See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).

## Quick links

| Topic | Document |
|-------|----------|
| **Run frontend and backend** | [docs/HOW_TO_RUN.md](docs/HOW_TO_RUN.md) |
| **Frontend–backend integration** | [docs/INTEGRATION_CHECKLIST.md](docs/INTEGRATION_CHECKLIST.md) |
| **Manual test cases** | [docs/MANUAL_TEST_CASES.md](docs/MANUAL_TEST_CASES.md) |
| **Automated and manual testing** | [docs/TESTING.md](docs/TESTING.md) |

## Run (summary)

1. **Backend:** `cd pixel-perfect-backend` → set `.env.local` (Supabase, NextAuth) → `npm run dev` (port 3001).
2. **Frontend:** `cd pixel-perfect-frontend` → set `.env` with `VITE_API_URL=http://localhost:3001` → `npm run dev` (e.g. port 5173).
3. Open http://localhost:5173 and register with a UNITEN email; promote a user to admin in Supabase if needed.

See [docs/HOW_TO_RUN.md](docs/HOW_TO_RUN.md) for full steps (Supabase, env vars, first admin).

## Tests

- **Manual:** Follow [docs/MANUAL_TEST_CASES.md](docs/MANUAL_TEST_CASES.md) for each module.
- **Automated:**  
  - Frontend: `cd pixel-perfect-frontend && npm run test`  
  - Backend: `cd pixel-perfect-backend && npm run test`

See [docs/TESTING.md](docs/TESTING.md) for details.
