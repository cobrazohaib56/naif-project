import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("llm", () => {
  let callLlm: typeof import("./llm").callLlm;

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("callLlm throws when API key is missing", () => {
    it("throws if HUGGINGFACE_API_KEY is not set", async () => {
      vi.stubEnv("HUGGINGFACE_API_KEY", "");
      const mod = await import("./llm");
      callLlm = mod.callLlm;

      await expect(callLlm("system", "user")).rejects.toThrow(
        "HUGGINGFACE_API_KEY is not set"
      );
    });
  });

  describe("content moderation via callLlm", () => {
    beforeEach(async () => {
      vi.stubEnv("HUGGINGFACE_API_KEY", "test-key");
      const mod = await import("./llm");
      callLlm = mod.callLlm;
    });

    it("returns safe fallback when response contains unsafe word 'hack'", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([{ generated_text: "Here is how to hack the system" }]))
      );

      const result = await callLlm("system prompt", "user message");
      expect(result).toBe(
        "I can only help with academic topics. Please rephrase your question."
      );
    });

    it("returns safe fallback for violent content", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([{ generated_text: "Instructions to make a bomb" }]))
      );

      const result = await callLlm("system", "user");
      expect(result).toBe(
        "I can only help with academic topics. Please rephrase your question."
      );
    });

    it("returns safe fallback for explicit content", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([{ generated_text: "Some porn content here" }]))
      );

      const result = await callLlm("system", "user");
      expect(result).toBe(
        "I can only help with academic topics. Please rephrase your question."
      );
    });

    it("passes through clean academic text unchanged", async () => {
      const cleanText = "Quantum mechanics describes the behavior of particles at the atomic scale.";
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([{ generated_text: cleanText }]))
      );

      const result = await callLlm("system", "user");
      expect(result).toBe(cleanText);
    });

    it("calls HuggingFace API with correct URL and headers", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([{ generated_text: "Answer" }]))
      );

      await callLlm("system prompt", "user message");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("api-inference.huggingface.co/models/"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-key",
          }),
        })
      );
    });

    it("throws on non-ok HuggingFace response", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response("Model overloaded", { status: 503 })
      );

      await expect(callLlm("system", "user")).rejects.toThrow("Model overloaded");
    });

    it("handles response as single object (not array)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ generated_text: "Single response" }))
      );

      const result = await callLlm("system", "user");
      expect(result).toBe("Single response");
    });

    it("returns empty string when generated_text is missing", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify([{}]))
      );

      const result = await callLlm("system", "user");
      expect(result).toBe("");
    });
  });
});
