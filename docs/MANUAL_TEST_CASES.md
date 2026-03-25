# Manual Test Cases — AI Study Companion

Use these steps to verify each module manually. Run with the backend at `http://localhost:3001` and frontend at `http://localhost:5173`. Have at least one **student** and one **admin** user (see HOW_TO_RUN.md).

---

## Module 1: Authentication

### 1.1 Register (student)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `/register` | Form with Email, Password, Name (optional). |
| 2 | Enter non-UNITEN email (e.g. `a@gmail.com`) | Error: only UNITEN email allowed. |
| 3 | Enter `test@uniten.edu.my`, password 8+ chars, optional name, submit | Redirect to `/login`; success. |
| 4 | Try same email again | Error: account already exists. |

### 1.2 Login & session

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open `/login`, enter wrong password | Error message. |
| 2 | Enter correct student email/password, submit | Redirect to `/` (Dashboard). |
| 3 | Refresh page | Still logged in; Dashboard loads. |
| 4 | Open sidebar / user area, click Logout | Redirect to login; session cleared. |
| 5 | Log in as admin (after `UPDATE users SET role='admin'`) | Redirect to `/admin`. |

### 1.3 Protected & admin routes

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log out, open `http://localhost:5173/` | Redirect to `/login`. |
| 2 | Log in as student, open `/admin` | Redirect to `/` (forbidden). |
| 3 | Log in as admin, open `/admin` | Admin dashboard loads. |

---

## Module 2: Notes & documents

### 2.1 List and upload

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as student, go to **Notes** | List of user’s notes (or empty). |
| 2 | Upload a PDF (or DOCX/TXT) | Note appears in list; no error. |
| 3 | Upload an invalid file (e.g. .exe) or very large file | Error message. |
| 4 | Click a note | Navigate to note detail; file metadata and download/view available. |

### 2.2 Note detail

| Step | Action | Expected |
|------|--------|----------|
| 1 | On note detail, check **Summary** tab | If no summary: “Generate summary” or similar. If summary exists: summary + key concepts. |
| 2 | Check **Chat** tab | Input to ask a question about the document. |

---

## Module 3: Note summarization

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open a note that has extracted text but no summary. | Summary tab shows option to generate. |
| 2 | Click generate summary | Loading, then summary text and key concepts appear. |
| 3 | Refresh or re-open note | Summary still there (stored). |

---

## Module 4: Quiz system

### 4.1 Student: list and take quiz

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as student, go to **Quizzes** | Only **active** quizzes listed. |
| 2 | Start a quiz | Timer (if set), questions with options; **no correct answer visible** in UI/network. |
| 3 | Answer and submit | Redirect to results; score and total shown. |
| 4 | On results, click **Review answers** (if attemptId present) | Dialog with per-question correct/incorrect and correct answer. |

### 4.2 Admin: quiz CRUD

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as admin, go to **Admin → Quiz Manager** | List of all quizzes (active + draft). |
| 2 | **Create Quiz** | Dialog; enter title, optional description/time limit; submit. New quiz appears (draft). |
| 3 | **Edit** a quiz | Dialog; change title/description/time limit/published; save. Changes persist. |
| 4 | **Publish** a draft quiz | Quiz becomes active; students see it in Quizzes. |
| 5 | **Unpublish** | Quiz becomes draft; students no longer see it. |
| 6 | **Delete** quiz (confirm) | Quiz removed from list. |

---

## Module 5: Writing improvement

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as student, go to **Writing Coach** | Text area / paste area. |
| 2 | Paste a short paragraph with obvious grammar issues | — |
| 3 | Click **Analyze** / **Improve** | Loading, then improved text and suggestions (grammar/clarity/style) shown. |

---

## Module 6: Task scheduling

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as student, go to **Schedule** | List of tasks (today + upcoming). |
| 2 | **Add Task**: title, due date, priority; submit | Task appears in list. |
| 3 | Toggle a task complete (e.g. checkbox) | Task marked complete (visual update). |
| 4 | **Delete** a task (trash icon, confirm) | Task removed. |
| 5 | Go to **Dashboard** | “Upcoming Tasks” shows same tasks (from same API). |

---

## Module 7: RAG (Ask AI) & document chat

### 7.1 Ask AI (UNITEN Q&A)

| Step | Action | Expected |
|------|--------|----------|
| 1 | (Admin) Upload at least one RAG document (Admin → Documents). | Upload succeeds; “Indexed N chunks” or similar. |
| 2 | Log in as student, go to **Ask AI** | Chat-like interface. |
| 3 | Ask a question related to uploaded content | Answer and sources (document titles/snippets) shown. |
| 4 | Ask with no RAG content indexed | Message like “no relevant documents indexed”. |

### 7.2 Document chat

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open a **note** that has text, go to **Chat** tab | Input for question. |
| 2 | Ask a question about the note content | Answer (and optional refs) shown. |

---

## Module 8: Admin

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as admin, open **Admin Dashboard** | Cards/stats: students, documents, quizzes, RAG docs. |
| 2 | Open **Admin → User Management** | List of (student) users. |
| 3 | Open **Admin → Documents** (RAG) | List of RAG documents; upload form works. |
| 4 | Open **Admin → Quiz Manager** | As in Module 4.2. |

---

## Module 9: Dashboard & integration

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as student, open **Dashboard** | Stats (notes summarized, quizzes, streak placeholder); Recent Notes; Upcoming Tasks (if any). |
| 2 | Check **Upcoming Tasks** | Loads from same API as Schedule; links to Schedule. |
| 3 | Trigger an error (e.g. wrong API URL, or invalid input) | Error message (toast or inline); no silent failure. |

---

## Automated test runs (reference)

- **Frontend:** From `pixel-perfect-frontend`: `npm install` then `npm run test` (Vitest). Tests the API client with mocked fetch.
- **Backend:** From `pixel-perfect-backend`: `npm install` then `npm run test` (Vitest). Tests document helpers (e.g. `isAllowedMime`, text extraction for .txt).

See **[TESTING.md](TESTING.md)** for full details.

Use these manual cases after any major change to confirm end-to-end behaviour.
