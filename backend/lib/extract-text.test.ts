import { describe, it, expect } from "vitest";
import { isAllowedMime, extractTextFromBuffer } from "./extract-text";

describe("extract-text", () => {
  describe("isAllowedMime", () => {
    it("allows application/pdf", () => {
      expect(isAllowedMime("application/pdf")).toBe(true);
    });

    it("allows DOCX mime type", () => {
      expect(
        isAllowedMime("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
      ).toBe(true);
    });

    it("allows text/plain", () => {
      expect(isAllowedMime("text/plain")).toBe(true);
    });

    it("rejects image and other types", () => {
      expect(isAllowedMime("image/png")).toBe(false);
      expect(isAllowedMime("application/json")).toBe(false);
      expect(isAllowedMime("")).toBe(false);
    });
  });

  describe("extractTextFromBuffer", () => {
    it("extracts plain text from buffer for text/plain", async () => {
      const buffer = Buffer.from("Hello world", "utf-8");
      const text = await extractTextFromBuffer(buffer, "text/plain", "file.txt");
      expect(text).toBe("Hello world");
    });

    it("extracts plain text when file name ends with .txt", async () => {
      const buffer = Buffer.from("Content here", "utf-8");
      const text = await extractTextFromBuffer(buffer, "text/plain", "notes.txt");
      expect(text).toBe("Content here");
    });

    it("throws for unsupported mime type", async () => {
      const buffer = Buffer.from("x");
      await expect(
        extractTextFromBuffer(buffer, "application/octet-stream", "file.bin")
      ).rejects.toThrow("Unsupported");
    });
  });
});
