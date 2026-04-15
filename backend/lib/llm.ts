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
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  const response = await callGemini(systemPrompt, userMessage);
  return moderateResponse(response);
}

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent(userMessage);
  const text = result.response.text();
  return text?.trim() ?? "";
}
