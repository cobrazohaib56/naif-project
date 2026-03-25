# Testing — AI Study Companion

This project has **manual test cases** and **automated tests** for the main modules.

---

## 1. Manual test cases

See **[MANUAL_TEST_CASES.md](MANUAL_TEST_CASES.md)** for step-by-step manual tests for:

- Module 1: Authentication (register, login, session, protected/admin routes)
- Module 2: Notes & documents (list, upload, note detail)
- Module 3: Note summarization
- Module 4: Quiz (student take, submit, review; admin CRUD, publish/unpublish)
- Module 5: Writing improvement
- Module 6: Task scheduling (create, update, delete, dashboard)
- Module 7: RAG (Ask AI, document chat, admin RAG upload)
- Module 8: Admin (dashboard, users, documents, quiz)
- Module 9: Dashboard & integration

Run the backend and frontend (see [HOW_TO_RUN.md](HOW_TO_RUN.md)), then follow the manual test cases to verify behaviour end-to-end.

---

## 2. Automated tests

### 2.1 Frontend (Vite + Vitest)

**Location:** `pixel-perfect-frontend`

**What’s tested:**

- **API client** (`src/lib/api.test.ts`): Request URLs, methods, and body/response handling for:
  - `getSession`, `register`, `getNotes`, `getTasks`, `getQuiz` (with/without admin), `askRag`, `improveWriting`, `createTask`, `updateQuiz`, `deleteQuiz`, `getAttemptResult`
  - Error handling (e.g. register returns backend error message)

**Run:**

```bash
cd pixel-perfect-frontend
npm install
npm run test
```

Watch mode:

```bash
npm run test:watch
```

Tests use **mocked `fetch`**; no backend or Supabase is required.

---

### 2.2 Backend (Next.js + Vitest)

**Location:** `pixel-perfect-backend`

**What’s tested:**

- **Document handling** (`lib/extract-text.test.ts`):
  - `isAllowedMime`: allows PDF, DOCX, TXT; rejects other types
  - `extractTextFromBuffer`: plain text extraction for `text/plain` and `.txt`; throws for unsupported types

**Run:**

```bash
cd pixel-perfect-backend
npm install
npm run test
```

Watch mode:

```bash
npm run test:watch
```

No Supabase or env vars are required for these unit tests.

---

## 3. Running all tests

From the **project root** (e.g. `Naif FYP Number 1`):

```bash
# Frontend
cd pixel-perfect-frontend && npm run test && cd ..

# Backend
cd pixel-perfect-backend && npm run test && cd ..
```

(On Windows PowerShell you can use `;` instead of `&&`.)

---

## 4. Adding more tests

- **Frontend:** Add `*.test.ts` or `*.spec.ts` under `pixel-perfect-frontend/src`. Use `vi.mocked(fetch)` to mock API calls. For components, use `@testing-library/react` (already in setup).
- **Backend:** Add `*.test.ts` under `lib/` or `app/`. Keep tests that need Supabase/NextAuth for integration tests or run them in a separate suite with env set.

Use **[INTEGRATION_CHECKLIST.md](INTEGRATION_CHECKLIST.md)** to ensure new features are covered by both integration (manual) and, where useful, automated tests.
