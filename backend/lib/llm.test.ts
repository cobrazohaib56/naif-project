import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("groq-sdk", () => {
  const create = vi.fn();
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: { completions: { create } },
    })),
    __mockCreate: create,
  };
});

vi.mock("@google/generative-ai", () => {
  const generateContent = vi.fn();
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: () => ({ generateContent }),
    })),
    __mockGenerateContent: generateContent,
  };
});

async function getGroqMock() {
  const mod = await import("groq-sdk") as { __mockCreate: ReturnType<typeof vi.fn> };
  return mod.__mockCreate;
}

async function getGeminiMock() {
  const mod = await import("@google/generative-ai") as { __mockGenerateContent: ReturnType<typeof vi.fn> };
  return mod.__mockGenerateContent;
}

describe("llm – GROQ provider (default)", () => {
  let callLlm: typeof import("./llm").callLlm;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("GROQ_API_KEY", "test-groq-key");
    vi.stubEnv("LLM_PROVIDER", "groq");

    vi.doMock("groq-sdk", () => {
      const create = vi.fn();
      return { default: vi.fn().mockImplementation(() => ({ chat: { completions: { create } } })), __mockCreate: create };
    });
    vi.doMock("@google/generative-ai", () => {
      const generateContent = vi.fn();
      return { GoogleGenerativeAI: vi.fn().mockImplementation(() => ({ getGenerativeModel: () => ({ generateContent }) })), __mockGenerateContent: generateContent };
    });

    const mod = await import("./llm");
    callLlm = mod.callLlm;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("throws when GROQ_API_KEY is missing", async () => {
    vi.resetModules();
    vi.stubEnv("GROQ_API_KEY", "");
    vi.stubEnv("LLM_PROVIDER", "groq");

    vi.doMock("groq-sdk", () => {
      const create = vi.fn();
      return { default: vi.fn().mockImplementation(() => ({ chat: { completions: { create } } })), __mockCreate: create };
    });
    vi.doMock("@google/generative-ai", () => {
      const generateContent = vi.fn();
      return { GoogleGenerativeAI: vi.fn().mockImplementation(() => ({ getGenerativeModel: () => ({ generateContent }) })), __mockGenerateContent: generateContent };
    });

    const mod = await import("./llm");
    await expect(mod.callLlm("system", "user")).rejects.toThrow("GROQ_API_KEY is not configured");
  });

  it("returns clean text from GROQ", async () => {
    const create = await getGroqMock();
    create.mockResolvedValueOnce({
      choices: [{ message: { content: "Quantum mechanics describes particle behavior." } }],
    });

    const result = await callLlm("system", "user");
    expect(result).toBe("Quantum mechanics describes particle behavior.");
  });

  it("returns safe fallback for unsafe content", async () => {
    const create = await getGroqMock();
    create.mockResolvedValueOnce({
      choices: [{ message: { content: "Here is how to hack the system" } }],
    });

    const result = await callLlm("system", "user");
    expect(result).toBe("I can only help with academic topics. Please rephrase your question.");
  });

  it("throws on empty GROQ response", async () => {
    const create = await getGroqMock();
    create.mockResolvedValueOnce({
      choices: [{ message: { content: "" } }],
    });

    await expect(callLlm("system", "user")).rejects.toThrow("GROQ returned an empty response");
  });
});

describe("llm – Gemini provider", () => {
  let callLlm: typeof import("./llm").callLlm;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
    vi.stubEnv("LLM_PROVIDER", "gemini");

    vi.doMock("groq-sdk", () => {
      const create = vi.fn();
      return { default: vi.fn().mockImplementation(() => ({ chat: { completions: { create } } })), __mockCreate: create };
    });
    vi.doMock("@google/generative-ai", () => {
      const generateContent = vi.fn();
      return { GoogleGenerativeAI: vi.fn().mockImplementation(() => ({ getGenerativeModel: () => ({ generateContent }) })), __mockGenerateContent: generateContent };
    });

    const mod = await import("./llm");
    callLlm = mod.callLlm;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("throws when GEMINI_API_KEY is missing", async () => {
    vi.resetModules();
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("LLM_PROVIDER", "gemini");

    vi.doMock("groq-sdk", () => {
      const create = vi.fn();
      return { default: vi.fn().mockImplementation(() => ({ chat: { completions: { create } } })), __mockCreate: create };
    });
    vi.doMock("@google/generative-ai", () => {
      const generateContent = vi.fn();
      return { GoogleGenerativeAI: vi.fn().mockImplementation(() => ({ getGenerativeModel: () => ({ generateContent }) })), __mockGenerateContent: generateContent };
    });

    const mod = await import("./llm");
    await expect(mod.callLlm("system", "user")).rejects.toThrow("GEMINI_API_KEY is not configured");
  });

  it("returns clean text from Gemini", async () => {
    const generateContent = await getGeminiMock();
    generateContent.mockResolvedValueOnce({
      response: {
        promptFeedback: {},
        text: () => "Photosynthesis converts light energy to chemical energy.",
      },
    });

    const result = await callLlm("system", "user");
    expect(result).toBe("Photosynthesis converts light energy to chemical energy.");
  });

  it("throws on blocked content", async () => {
    const generateContent = await getGeminiMock();
    generateContent.mockResolvedValueOnce({
      response: {
        promptFeedback: { blockReason: "SAFETY" },
        text: () => "",
      },
    });

    await expect(callLlm("system", "user")).rejects.toThrow("content safety filters");
  });
});
