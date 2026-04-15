import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const UNSAFE_PATTERNS = [
  /\b(hack|exploit|attack|malware|virus|weapon|bomb|kill|suicide|self[- ]?harm)\b/i,
  /\b(porn|nude|nsfw|xxx)\b/i,
  /\b(drug[s]?\s+recipe|how\s+to\s+make\s+.*bomb)\b/i,
];

const SAFE_FALLBACK = "I can only help with academic topics. Please rephrase your question.";

function moderateResponse(text: string): string {
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(text)) {
      return SAFE_FALLBACK;
    }
  }
  return text;
}

export async function callLlm(systemPrompt: string, userMessage: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Set it in your environment variables."
    );
  }
  try {
    const response = await callGemini(systemPrompt, userMessage);
    return moderateResponse(response);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[llm] Gemini API error:", msg);

    if (/api.key/i.test(msg) || /invalid/i.test(msg) || /401|403/.test(msg)) {
      throw new Error("Gemini API key is invalid or expired. Check GEMINI_API_KEY.");
    }
    if (/quota|429|resource.*exhausted/i.test(msg)) {
      throw new Error("Gemini API rate limit exceeded. Please try again in a moment.");
    }
    if (/safety/i.test(msg) || /blocked/i.test(msg)) {
      throw new Error("The AI could not generate a response due to content safety filters.");
    }
    throw new Error(`AI generation failed: ${msg}`);
  }
}

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userMessage);
  const response = result.response;

  if (response.promptFeedback?.blockReason) {
    throw new Error(`Content blocked: ${response.promptFeedback.blockReason}`);
  }

  const text = response.text();
  if (!text?.trim()) {
    throw new Error("Gemini returned an empty response");
  }
  return text.trim();
}
