import { describe, it, expect } from "vitest";
import { chunkText } from "./chunk";

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    const result = chunkText("Hello world", 500, 50);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Hello world");
  });

  it("returns empty array for empty string", () => {
    expect(chunkText("")).toEqual([]);
  });

  it("returns empty array for whitespace-only input", () => {
    expect(chunkText("   \n\t  ")).toEqual([]);
  });

  it("splits long text into multiple chunks", () => {
    const words = Array.from({ length: 200 }, (_, i) => `word${i}`);
    const text = words.join(" ");
    const chunks = chunkText(text, 100, 20);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeGreaterThan(0);
    }
  });

  it("produces overlapping chunks", () => {
    const text = "a ".repeat(300).trim();
    const chunks = chunkText(text, 100, 30);
    expect(chunks.length).toBeGreaterThan(1);
    const secondChunkStart = chunks[1].slice(0, 10);
    const firstChunkEnd = chunks[0].slice(-30);
    expect(firstChunkEnd).toContain(secondChunkStart.trim());
  });

  it("collapses extra whitespace", () => {
    const text = "hello   world\n\nnew   paragraph";
    const chunks = chunkText(text, 500, 50);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe("hello world new paragraph");
  });

  it("breaks at word boundaries (space) rather than mid-character-sequence", () => {
    const text = "alpha bravo charlie delta echo foxtrot golf hotel india juliet";
    const chunks = chunkText(text, 20, 5);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.endsWith(" ") || text.includes(chunk.trim())).toBe(true);
    }
  });
});
