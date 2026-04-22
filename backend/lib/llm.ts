import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

const PROVIDER = (process.env.LLM_PROVIDER ?? "groq").toLowerCase();
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash-lite";

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
  if (PROVIDER === "gemini") {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured. Set it in your environment variables.");
    }
    try {
      const response = await callGemini(systemPrompt, userMessage);
      return moderateResponse(response);
    } catch (err: unknown) {
      return handleLlmError(err, "Gemini", "GEMINI_API_KEY");
    }
  }

  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured. Set it in your environment variables.");
  }
  try {
    const response = await callGroq(systemPrompt, userMessage);
    return moderateResponse(response);
  } catch (err: unknown) {
    return handleLlmError(err, "GROQ", "GROQ_API_KEY");
  }
}

function handleLlmError(err: unknown, providerName: string, keyEnvVar: string): never {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[llm] ${providerName} API error:`, msg);

  if (/api.key/i.test(msg) || /invalid/i.test(msg) || /401|403/.test(msg)) {
    throw new Error(`${providerName} API key is invalid or expired. Check ${keyEnvVar}.`);
  }
  if (/quota|429|resource.*exhausted|rate.limit/i.test(msg)) {
    throw new Error(`${providerName} API rate limit exceeded. Please try again in a moment.`);
  }
  if (/safety/i.test(msg) || /blocked/i.test(msg)) {
    throw new Error("The AI could not generate a response due to content safety filters.");
  }
  throw new Error(`AI generation failed: ${msg}`);
}

async function callGroq(systemPrompt: string, userMessage: string): Promise<string> {
  const groq = new Groq({ apiKey: GROQ_API_KEY! });
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  });

  const text = completion.choices[0]?.message?.content;
  if (!text?.trim()) {
    throw new Error("GROQ returned an empty response");
  }
  return text.trim();
}

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
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
