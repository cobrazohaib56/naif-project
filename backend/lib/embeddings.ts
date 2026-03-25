const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_EMBED_MODEL = process.env.HUGGINGFACE_EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";

const EMBED_DIM = 384; // all-MiniLM-L6-v2 produces 384-dim vectors; must match vector(384) in SQL schema

export async function embedText(text: string): Promise<number[]> {
  if (!HF_API_KEY) {
    throw new Error("HUGGINGFACE_API_KEY is not set. Please add it to your .env.local file.");
  }
  return embedHuggingFace(text);
}

async function embedHuggingFace(text: string): Promise<number[]> {
  const res = await fetch(
    `https://api-inference.huggingface.co/models/${HF_EMBED_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text.slice(0, 8000),
        options: { wait_for_model: true },
      }),
    }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HuggingFace embed error: ${res.status}`);
  }
  const data = (await res.json()) as number[] | { embedding: number[] };
  if (Array.isArray(data)) return data;
  return data.embedding ?? [];
}

export function getEmbeddingDimension(): number {
  return EMBED_DIM;
}
