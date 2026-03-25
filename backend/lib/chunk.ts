export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  const cleaned = text.replace(/\s+/g, " ").trim();
  while (start < cleaned.length) {
    let end = start + chunkSize;
    if (end < cleaned.length) {
      const nextSpace = cleaned.indexOf(" ", end);
      if (nextSpace !== -1) end = nextSpace + 1;
    }
    chunks.push(cleaned.slice(start, end));
    start = end - overlap;
    if (start < 0) start = 0;
    if (start >= cleaned.length) break;
  }
  return chunks.filter((c) => c.length > 0);
}
