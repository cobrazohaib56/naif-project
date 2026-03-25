const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_MODEL = process.env.HUGGINGFACE_LLM_MODEL || "mistralai/Mistral-7B-Instruct-v0.2";

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
  if (!HF_API_KEY) {
    throw new Error("HUGGINGFACE_API_KEY is not configured.");
  }
  const response = await callHuggingFace(systemPrompt, userMessage);
  return moderateResponse(response);
}

async function callHuggingFace(systemPrompt: string, userMessage: string): Promise<string> {
  const res = await fetch(
    `https://api-inference.huggingface.co/models/${HF_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: `${systemPrompt}\n\n${userMessage}`,
        parameters: { max_new_tokens: 2048, return_full_text: false },
      }),
    }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HuggingFace error: ${res.status}`);
  }
  const data = (await res.json()) as { generated_text?: string } | { generated_text?: string }[];
  const out = Array.isArray(data) ? data[0] : data;
  return out?.generated_text?.trim() ?? "";
}
