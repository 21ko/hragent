import { NextResponse } from "next/server";
import { detectKind, extractCvText, looksScanned } from "@/lib/cv-extract";
import { parseAndValidateCv, parseScannedPdf } from "@/lib/cv-parser";
import { insertCandidates } from "@/lib/db";
import { checkAdminKey } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_FILES = 20;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const CONCURRENCY = 3;

interface ImportResult {
  filename: string;
  candidate?: NonNullable<
    Awaited<ReturnType<typeof parseAndValidateCv>>["candidate"]
  >;
  needsReview: boolean;
  skipped: boolean;
  reason?: string;
  fromCache?: boolean;
}

export async function POST(req: Request) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const form = await req.formData();
  const files = form
    .getAll("files")
    .filter((value): value is File => value instanceof File)
    .slice(0, MAX_FILES);

  if (!files.length) {
    return NextResponse.json(
      { error: "Upload at least one PDF, DOCX or TXT file in `files`." },
      { status: 400 },
    );
  }

  const results = await mapWithConcurrency(files, CONCURRENCY, processFile);
  const valid = results.flatMap((result) =>
    result.candidate ? [result.candidate] : [],
  );
  const persisted = await insertCandidates(valid);

  return NextResponse.json({
    imported: persisted.inserted,
    updated: persisted.updated,
    skipped: results.filter((result) => result.skipped).length,
    needsReview: results.filter((result) => result.needsReview).length,
    cached: results.filter((result) => result.fromCache).length,
    results: results.map(({ candidate, ...result }) => ({
      ...result,
      name: candidate?.name,
      role_type: candidate?.role_type,
    })),
  });
}

async function processFile(file: File): Promise<ImportResult> {
  try {
    if (file.size > MAX_FILE_BYTES) {
      return {
        filename: file.name,
        needsReview: false,
        skipped: true,
        reason: "File exceeds the 8 MB limit.",
      };
    }
    if (!isSupported(file.name, file.type)) {
      return {
        filename: file.name,
        needsReview: false,
        skipped: true,
        reason: "Unsupported file type.",
      };
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const kind = detectKind(file.name, file.type);
    const extracted = await extractCvText(buffer, kind);
    if (looksScanned(extracted)) {
      const parsed = await parseScannedPdf(buffer);
      return {
        filename: file.name,
        candidate: parsed.candidate ?? undefined,
        needsReview: parsed.needsReview,
        skipped: !parsed.candidate,
        reason: parsed.reason,
        fromCache: parsed.fromCache,
      };
    }
    const parsed = await parseAndValidateCv(extracted.text);
    return {
      filename: file.name,
      candidate: parsed.candidate ?? undefined,
      needsReview: parsed.needsReview,
      skipped: !parsed.candidate,
      reason: parsed.reason,
      fromCache: parsed.fromCache,
    };
  } catch (error) {
    return {
      filename: file.name,
      needsReview: true,
      skipped: true,
      reason: error instanceof Error ? error.message : "Import failed.",
    };
  }
}

function isSupported(filename: string, mime: string): boolean {
  const lower = filename.toLowerCase();
  return (
    lower.endsWith(".pdf") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".txt") ||
    mime === "application/pdf" ||
    mime === "text/plain" ||
    mime.includes("wordprocessingml")
  );
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return results;
}
