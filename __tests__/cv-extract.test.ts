import { describe, it, expect } from "vitest";
import { detectKind, looksScanned } from "../lib/cv-extract";
import type { ExtractedCv } from "../lib/cv-extract";

describe("detectKind", () => {
  it("detects PDF by extension", () => {
    expect(detectKind("resume.pdf")).toBe("pdf");
    expect(detectKind("RESUME.PDF")).toBe("pdf");
  });

  it("detects PDF by mime type", () => {
    expect(detectKind("file", "application/pdf")).toBe("pdf");
  });

  it("detects DOCX by extension", () => {
    expect(detectKind("resume.docx")).toBe("docx");
    expect(detectKind("CV.DOCX")).toBe("docx");
  });

  it("detects DOCX by mime type", () => {
    expect(
      detectKind("file", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ).toBe("docx");
  });

  it("defaults to txt for unknown extensions", () => {
    expect(detectKind("notes.txt")).toBe("txt");
    expect(detectKind("resume.doc")).toBe("txt");
    expect(detectKind("file.unknown")).toBe("txt");
  });
});

describe("looksScanned", () => {
  it("returns true for PDF with very little text", () => {
    const cv: ExtractedCv = { text: "Page 1", kind: "pdf", charCount: 6 };
    expect(looksScanned(cv)).toBe(true);
  });

  it("returns false for PDF with enough text", () => {
    const cv: ExtractedCv = {
      text: "A".repeat(100),
      kind: "pdf",
      charCount: 100,
    };
    expect(looksScanned(cv)).toBe(false);
  });

  it("returns false for DOCX regardless of text length", () => {
    const cv: ExtractedCv = { text: "", kind: "docx", charCount: 0 };
    expect(looksScanned(cv)).toBe(false);
  });

  it("returns false for txt regardless of text length", () => {
    const cv: ExtractedCv = { text: "", kind: "txt", charCount: 0 };
    expect(looksScanned(cv)).toBe(false);
  });

  it("returns true at the threshold boundary (charCount < 40)", () => {
    const cv: ExtractedCv = { text: "A".repeat(39), kind: "pdf", charCount: 39 };
    expect(looksScanned(cv)).toBe(true);
  });

  it("returns false at 40 characters", () => {
    const cv: ExtractedCv = { text: "A".repeat(40), kind: "pdf", charCount: 40 };
    expect(looksScanned(cv)).toBe(false);
  });
});
