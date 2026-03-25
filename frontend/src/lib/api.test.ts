import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "./api";

describe("api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  describe("getSession", () => {
    it("calls GET /api/auth/session with credentials", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { id: "1", email: "a@uniten.edu.my", role: "student" } }))
      );

      const result = await api.getSession();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/session"),
        expect.objectContaining({ credentials: "include" })
      );
      expect(result?.user?.email).toBe("a@uniten.edu.my");
      expect(result?.user?.role).toBe("student");
    });

    it("returns null when session is not ok", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 401 }));

      const result = await api.getSession();

      expect(result).toBeNull();
    });
  });

  describe("register", () => {
    it("calls POST /api/auth/register with email, password, name", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "u1", email: "b@uniten.edu.my", role: "student", name: "Test" }))
      );

      const result = await api.register("b@uniten.edu.my", "password123", "Test");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/register"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "b@uniten.edu.my", password: "password123", name: "Test" }),
        })
      );
      expect(result.email).toBe("b@uniten.edu.my");
      expect(result.role).toBe("student");
    });

    it("throws with message from backend on 400", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Only UNITEN email (@uniten.edu.my) is allowed" }), { status: 400 })
      );

      await expect(api.register("x@gmail.com", "password123")).rejects.toThrow("Only UNITEN email");
    });
  });

  describe("getNotes", () => {
    it("calls GET /api/notes and returns array", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: "n1", name: "Doc.pdf", date: "2025-01-01", fileType: "pdf", summarized: true },
          ])
        )
      );

      const result = await api.getNotes();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/notes"),
        expect.objectContaining({ credentials: "include" })
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].name).toBe("Doc.pdf");
      expect(result[0].summarized).toBe(true);
    });
  });

  describe("getTasks", () => {
    it("calls GET /api/tasks and returns array", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: "t1", title: "Task 1", due_date: "2025-02-01", priority: "high", is_completed: false },
          ])
        )
      );

      const result = await api.getTasks();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/tasks"),
        expect.objectContaining({ credentials: "include" })
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].title).toBe("Task 1");
    });
  });

  describe("getQuiz", () => {
    it("calls GET /api/quiz/:id without admin param by default", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "q1",
            title: "Quiz 1",
            questions: [{ id: "qu1", question: "Q?", options: ["A", "B"], optionIds: ["o1", "o2"] }],
          })
        )
      );

      await api.getQuiz("q1");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/quiz/q1"),
        expect.any(Object)
      );
    });

    it("calls GET /api/quiz/:id?admin=true when admin true", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "q1", title: "Quiz 1", questions: [] }))
      );

      await api.getQuiz("q1", true);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/quiz/q1"),
        expect.any(Object)
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("admin=true"),
        expect.any(Object)
      );
    });
  });

  describe("askRag", () => {
    it("calls POST /api/rag/ask with question and optional courseFilter", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ answer: "Yes.", sources: [] }))
      );

      await api.askRag("What is the policy?", "CS");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/rag/ask"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ question: "What is the policy?", courseFilter: "CS" }),
        })
      );
    });
  });

  describe("improveWriting", () => {
    it("calls POST /api/writing/improve with originalText", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            improvedText: "Improved.",
            suggestions: [{ type: "grammar", original: "x", improved: "y", explanation: "z" }],
          })
        )
      );

      const result = await api.improveWriting("Original text.");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/writing/improve"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ originalText: "Original text." }),
        })
      );
      expect(result.improvedText).toBe("Improved.");
      expect(result.suggestions).toHaveLength(1);
    });
  });

  describe("createTask", () => {
    it("calls POST /api/tasks with task fields", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "t1", title: "New Task" }))
      );

      await api.createTask({
        title: "New Task",
        due_date: "2025-03-01",
        priority: "medium",
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/tasks"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            title: "New Task",
            due_date: "2025-03-01",
            priority: "medium",
          }),
        })
      );
    });
  });

  describe("updateQuiz", () => {
    it("calls PUT /api/quiz/:id with updates", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: true })));

      await api.updateQuiz("q1", { title: "New Title", is_active: true });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/quiz/q1"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ title: "New Title", is_active: true }),
        })
      );
    });
  });

  describe("deleteQuiz", () => {
    it("calls DELETE /api/quiz/:id", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ success: true })));

      await api.deleteQuiz("q1");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/quiz/q1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("getAttemptResult", () => {
    it("calls GET /api/quiz/attempts/:attemptId", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            attemptId: "a1",
            quizTitle: "Quiz 1",
            score: 8,
            total: 10,
            percentage: 80,
            questions: [],
          })
        )
      );

      const result = await api.getAttemptResult("a1");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/quiz/attempts/a1"),
        expect.any(Object)
      );
      expect(result.score).toBe(8);
      expect(result.total).toBe(10);
    });
  });
});
