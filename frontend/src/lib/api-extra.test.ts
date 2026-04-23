import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "./api";

describe("api (extra coverage)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("getQuizzes", () => {
    it("calls GET /api/quiz without admin param by default", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([{ id: "q1", title: "Quiz", is_active: true, questions: 5 }]))
      );

      const result = await api.getQuizzes();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/quiz"),
        expect.objectContaining({ credentials: "include" })
      );
      expect(fetch).not.toHaveBeenCalledWith(
        expect.stringContaining("admin=true"),
        expect.any(Object)
      );
      expect(result[0].title).toBe("Quiz");
    });

    it("calls GET /api/quiz?admin=true when admin flag is set", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([]))
      );

      await api.getQuizzes(true);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/quiz?admin=true"),
        expect.any(Object)
      );
    });
  });

  describe("submitQuiz", () => {
    it("calls POST /api/quiz/:id/submit with answers", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ attemptId: "a1", score: 3, total: 5, percentage: 60 }))
      );

      const result = await api.submitQuiz("q1", [
        { questionId: "qu1", selectedOptionId: "o1" },
      ]);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/quiz/q1/submit"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ answers: [{ questionId: "qu1", selectedOptionId: "o1" }] }),
        })
      );
      expect(result.score).toBe(3);
      expect(result.total).toBe(5);
    });
  });

  describe("createQuiz", () => {
    it("calls POST /api/quiz with title and optional fields", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "q1", title: "New Quiz" }))
      );

      const result = await api.createQuiz("New Quiz", "Description", 30);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/quiz"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "New Quiz",
            description: "Description",
            time_limit_minutes: 30,
            is_active: false,
          }),
        })
      );
      expect(result.id).toBe("q1");
    });
  });

  describe("deleteTask", () => {
    it("calls DELETE /api/tasks?id=:id", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }))
      );

      await api.deleteTask("t1");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/tasks?id=t1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("updateTask", () => {
    it("calls PUT /api/tasks with id and updates", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "t1", is_completed: true }))
      );

      await api.updateTask("t1", { is_completed: true });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/tasks"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ id: "t1", is_completed: true }),
        })
      );
    });
  });

  describe("summarize", () => {
    it("calls POST /api/summarize with documentId", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ summary: "Summary text", keyConcepts: ["A", "B"] }))
      );

      const result = await api.summarize("doc-123");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/summarize"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ documentId: "doc-123" }),
        })
      );
      expect(result.summary).toBe("Summary text");
      expect(result.keyConcepts).toEqual(["A", "B"]);
    });
  });

  describe("uploadNote", () => {
    it("calls POST /api/notes/upload with FormData", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "n1", file_name: "test.pdf", file_path: "notes/x/n1.pdf" }))
      );

      const file = new File(["content"], "test.pdf", { type: "application/pdf" });
      const result = await api.uploadNote(file);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/notes/upload"),
        expect.objectContaining({
          method: "POST",
          credentials: "include",
        })
      );
      expect(result.id).toBe("n1");
    });
  });

  describe("signOut", () => {
    it("calls POST /api/auth/signout", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));

      await api.signOut();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/signout"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("getNote", () => {
    it("calls GET /api/notes/:id and returns detail", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "n1",
            file_name: "doc.pdf",
            file_type: "pdf",
            upload_date: "2025-01-01",
            download_url: "https://example.com/signed",
            summary: null,
          })
        )
      );

      const result = await api.getNote("n1");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/notes/n1"),
        expect.objectContaining({ credentials: "include" })
      );
      expect(result.file_name).toBe("doc.pdf");
      expect(result.download_url).toBe("https://example.com/signed");
    });
  });

  describe("notesChat", () => {
    it("calls POST /api/notes/chat with documentId and question", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            answer: "The document says...",
            pageReferences: [{ documentTitle: "doc.pdf", snippet: "text" }],
          })
        )
      );

      const result = await api.notesChat("doc-1", "What is this about?");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/notes/chat"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ documentId: "doc-1", question: "What is this about?" }),
        })
      );
      expect(result.answer).toBe("The document says...");
    });
  });

  describe("getAdminAnalytics", () => {
    it("calls GET /api/admin/analytics", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ totalStudents: 10, totalDocuments: 5, activeQuizzes: 3, ragDocumentsIndexed: 2 })
        )
      );

      const result = await api.getAdminAnalytics();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/analytics"),
        expect.objectContaining({ credentials: "include" })
      );
      expect(result.totalStudents).toBe(10);
      expect(result.activeQuizzes).toBe(3);
    });
  });

  describe("getAdminUsers", () => {
    it("calls GET /api/admin/users and returns user list", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ id: "u1", email: "s@uniten.edu.my", role: "student", created_at: "2025-01-01" }])
        )
      );

      const result = await api.getAdminUsers();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/users"),
        expect.objectContaining({ credentials: "include" })
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].email).toBe("s@uniten.edu.my");
    });
  });

  describe("toggleUserStatus", () => {
    it("calls PATCH /api/admin/users with userId and is_active", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: "u1", email: "s@uniten.edu.my", role: "student", is_active: false, created_at: "2025-01-01" })
        )
      );

      const result = await api.toggleUserStatus("u1", false);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/users"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ userId: "u1", is_active: false }),
        })
      );
      expect(result.is_active).toBe(false);
    });
  });

  describe("getAdminRagDocuments", () => {
    it("calls GET /api/admin/rag/documents", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify([{ id: "r1", title: "Policy Doc", chunksCount: 12 }])
        )
      );

      const result = await api.getAdminRagDocuments();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/rag/documents"),
        expect.objectContaining({ credentials: "include" })
      );
      expect(result[0].title).toBe("Policy Doc");
      expect(result[0].chunksCount).toBe(12);
    });
  });

  describe("addQuizQuestions", () => {
    it("calls POST /api/quiz/:id/questions with questions array", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }))
      );

      await api.addQuizQuestions("q1", [
        { questionText: "What is 2+2?", options: ["3", "4", "5", "6"], correctAnswer: "4" },
      ]);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/quiz/q1/questions"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            questions: [{ questionText: "What is 2+2?", options: ["3", "4", "5", "6"], correctAnswer: "4" }],
          }),
        })
      );
    });
  });

  describe("generateQuiz", () => {
    it("calls POST /api/quiz/generate with ragDocumentId and options", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            questions: [{ questionText: "Q?", options: ["A", "B", "C", "D"], correctAnswer: "A", type: "mcq", order_index: 0 }],
          })
        )
      );

      const result = await api.generateQuiz({
        ragDocumentId: "rag-1",
        numQuestions: 5,
        questionType: "mcq",
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/quiz/generate"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ ragDocumentId: "rag-1", numQuestions: 5, questionType: "mcq" }),
        })
      );
      expect(result.questions).toHaveLength(1);
    });
  });
});
