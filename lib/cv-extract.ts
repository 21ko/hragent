/**
 * CV text extraction — the token-saving layer.
 *
 * We extract plain text from PDF/DOCX *locally* and only send that text to the
 * LLM, instead of shipping the raw PDF as a vision `document` block (which costs
 * ~3–6k tokens/CV). Text extraction lands a CV at ~400–800 tokens and is
 * cacheable. See docs/cv-import.md for the full pipeline + the next steps a
 * follow-up agent should implement.
 *
 * Deps (install before wiring the real extractors):
 *   npm i unpdf mammoth
 * Both are imported dynamically so the project still builds before they exist.
 */

export type CvFileKind = "pdf" | "docx" | "txt";

export interface ExtractedCv {
  /** Plain/markdown text the LLM will read. */
  text: string;
  kind: CvFileKind;
  /** Cheap signal for the parser: empty text => likely a scanned/image PDF. */
  charCount: number;
}

export function detectKind(filename: string, mime?: string): CvFileKind {
  const f = filename.toLowerCase();
  if (f.endsWith(".pdf") || mime === "application/pdf") return "pdf";
  if (f.endsWith(".docx") || mime?.includes("wordprocessingml")) return "docx";
  return "txt";
}

/** Extract text from a CV buffer. Returns markdown-ish plain text. */
export async function extractCvText(
  buf: Buffer,
  kind: CvFileKind,
): Promise<ExtractedCv> {
  let text = "";

  if (kind === "pdf") {
    // unpdf wraps pdf.js and runs in Node/serverless without native binaries.
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text: pages } = await extractText(pdf, { mergePages: true });
    text = Array.isArray(pages) ? pages.join("\n") : pages;
  } else if (kind === "docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: buf });
    text = value;
  } else {
    text = buf.toString("utf8");
  }

  text = text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
  return { text, kind, charCount: text.length };
}

/**
 * Scanned/image PDFs extract to ~no text. The follow-up agent should route
 * these to a vision fallback (send THAT pdf as a document block) — rare, so the
 * cost stays bounded. Threshold is deliberately low.
 */
export function looksScanned(extracted: ExtractedCv): boolean {
  return extracted.kind === "pdf" && extracted.charCount < 40;
}
