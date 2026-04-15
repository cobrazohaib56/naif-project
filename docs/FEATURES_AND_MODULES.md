# AI Study Companion — Features & Modules

This document describes every module in the application, what it does, and how users interact with it.

---

## User Roles

The app has two roles:

- **Student** — The default role. Can upload notes, take quizzes, use AI tools, manage a schedule, and update their profile.
- **Admin** — Has everything a student has, plus access to admin-only pages for managing users, quizzes, documents, and sending emails.

An admin can disable a student account, which prevents that student from signing in.

---

## 1. Authentication

### Registration
- Any user can create an account with their email, a password (min 8 characters), and an optional display name.
- A welcome email is sent after successful registration.
- The user is redirected to the login page.

### Login
- Email and password sign-in.
- Sessions last 30 days (JWT-based).

### Forgot Password
- Enter your email on the Forgot Password page.
- A password reset link is sent to that email.
- The link is valid for 1 hour.

### Reset Password
- Click the link from the email.
- Enter a new password (min 8 characters).
- A confirmation email is sent after the password is changed.

---

## 2. Dashboard

The home page after login. Shows:

- Total number of uploaded notes.
- Number of available quizzes.
- Upcoming tasks from the schedule.
- Quick links to Notes, Quizzes, and Schedule.

---

## 3. My Notes

### Upload
- Upload PDF, DOCX, or TXT files (max 20 MB).
- Text is automatically extracted from the uploaded file for use by AI features.

### View Notes
- See a list of all uploaded notes with file name, type, and upload date.
- Click a note to open its detail page.

### Note Detail Page
- **Document viewer** — Preview or download the uploaded file.
- **Summary tab** — Generate an AI summary of the document. Key concepts are extracted and listed separately.
- **Key Concepts tab** — View the extracted key concepts (available after a summary is generated).
- **Chat tab** — Ask questions about the document and get answers based on its content.

### Delete Notes
- Delete a note from the list page or from the detail page.
- Deleting a note also removes its file from storage and any generated summaries.

---

## 4. Quiz Zone (Student View)

### Browse Quizzes
- See all active quizzes created by admins.
- Each quiz shows its title, description, and number of questions.

### Take a Quiz
- Answer multiple-choice questions one by one.
- Submit the quiz when finished.

### View Results
- See your score and review which answers were correct or incorrect.

---

## 5. Ask AI (RAG Q&A)

- A chat interface where students can ask academic questions.
- Answers are generated from documents that admins have uploaded and indexed (the RAG knowledge base).
- Responses include source citations so students know where the information came from.
- An optional course filter can narrow results to a specific subject.

---

## 6. Writing Coach

- Paste any text (essay, report, assignment draft).
- The AI improves it for grammar, clarity, and academic tone.
- Returns the improved text along with specific suggestions (grammar fixes, clarity improvements, style recommendations).

---

## 7. Schedule / Task Manager

- Create tasks with a title, description, due date, and priority (low, medium, high).
- Mark tasks as completed.
- Tasks appear on the Dashboard as upcoming reminders.
- Notifications alert you when a task's due date is approaching.

---

## 8. Settings / Profile

- View your account details (email, name, role, account creation date).
- Update your display name.
- Access the password reset flow from the settings page.

---

## Admin-Only Modules

These pages and features are only visible and accessible to users with the admin role.

---

## 9. Admin Dashboard

- Overview statistics:
  - Total number of students.
  - Total uploaded documents.
  - Number of active quizzes.
  - Number of indexed RAG documents.

---

## 10. Quiz Manager (Admin)

### Create Quizzes
- Create a new quiz with a title, description, and optional time limit.

### Manage Questions
- **Add Manually** — Add multiple-choice questions with 4 options and mark the correct answer.
- **AI Generate** — Paste source text and the AI generates quiz questions from it. Preview the generated questions before saving.
- **Delete Questions** — Remove individual questions from a quiz.

### Edit / Delete Quizzes
- Update quiz title, description, or time limit.
- Toggle a quiz between active and inactive (inactive quizzes are hidden from students).
- Delete a quiz entirely.

---

## 11. RAG Document Management (Admin)

### Upload Documents
- Upload files to build the institutional knowledge base.
- Add metadata: title, department, and course.
- Uploaded documents are automatically chunked, embedded, and indexed for AI-powered search.

### View Indexed Documents
- See all uploaded RAG documents with their metadata and chunk count.

---

## 12. User Management (Admin)

- View a list of all student accounts.
- **Enable / Disable accounts** — Toggle a student's active status. Disabled students cannot sign in.
- **Send Email** — Compose and send a custom email to any student directly from the admin panel.

---

## 13. Email System

The app sends emails for the following events:

| Event | Recipient | Trigger |
|-------|-----------|---------|
| Welcome email | New user | After registration |
| Password reset link | User | Forgot password request |
| Password changed confirmation | User | After successful reset |
| Custom email | Any user | Admin sends from User Management |

Emails are sent via Gmail SMTP using the credentials configured in `SMTP_USER` and `SMTP_PASS` environment variables.

---

## Navigation Summary

### Student Sidebar
| Menu Item | Page |
|-----------|------|
| Dashboard | `/` |
| My Notes | `/notes` |
| Quiz Zone | `/quizzes` |
| Ask AI | `/ask-ai` |
| Writing Coach | `/writing-coach` |
| Schedule | `/schedule` |
| Settings | `/settings` |

### Admin Sidebar (additional items)
| Menu Item | Page |
|-----------|------|
| Admin Dashboard | `/admin` |
| RAG Documents | `/admin/documents` |
| Quiz Manager | `/admin/quiz` |
| User Management | `/admin/users` |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript, Vite, TailwindCSS, shadcn/ui |
| Backend | Next.js API Routes (port 3001) |
| Database | PostgreSQL (Supabase) with pgvector extension |
| Auth | NextAuth v5 (JWT sessions, credentials provider) |
| AI | Google Gemini API |
| Embeddings | HuggingFace Inference API (sentence-transformers) |
| File Storage | Supabase Storage |
| Email | Nodemailer (Gmail SMTP) |
| Deployment | Render (backend as web service, frontend as static site) |
