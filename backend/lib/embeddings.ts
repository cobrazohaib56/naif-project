const EMBEDDING_PROVIDER = (process.env.EMBEDDING_PROVIDER ?? "jina").toLowerCase();

const JINA_API_KEY = process.env.JINA_API_KEY;
const JINA_MODEL = process.env.JINA_EMBEDDING_MODEL || "jina-embeddings-v3";

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_EMBED_MODEL =
  process.env.HUGGINGFACE_EMBEDDING_MODEL || "sentence-transformers/all-MiniLM-L6-v2";

const EMBED_DIM = 384;

export async function embedText(text: string, kind: "query" | "passage" = "passage"): Promise<number[]> {
  const input = text.slice(0, 8000);

  if (EMBEDDING_PROVIDER === "huggingface") {
    if (!HF_API_KEY) {
      throw new Error("HUGGINGFACE_API_KEY is not configured.");
    }
    return embedHuggingFace(input);
  }

  if (!JINA_API_KEY) {
    throw new Error(
      "JINA_API_KEY is not configured. Get a free key at https://jina.ai and set it on Render."
    );
  }
  return embedJina(input, kind);
}

async function embedJina(text: string, kind: "query" | "passage"): Promise<number[]> {
  const res = await fetch("https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${JINA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: JINA_MODEL,
      task: kind === "query" ? "retrieval.query" : "retrieval.passage",
      dimensions: EMBED_DIM,
      input: [text],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jina embeddings error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    data?: { embedding: number[] }[];
  };

  const vec = data.data?.[0]?.embedding;
  if (!Array.isArray(vec) || vec.length === 0) {
    throw new Error("Jina returned an empty embedding");
  }
  if (vec.length !== EMBED_DIM) {
    throw new Error(
      `Jina returned ${vec.length}-dim vector but schema expects ${EMBED_DIM}. Check JINA_EMBEDDING_MODEL / dimensions.`
    );
  }
  return vec;
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
        inputs: text,
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
