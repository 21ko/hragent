import { NextResponse } from "next/server";

/** 400 Bad Request with a JSON error body. */
export function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/** 401 Unauthorized with a JSON error body. */
export function unauthorized(error = "Unauthorized.") {
  return NextResponse.json({ error }, { status: 401 });
}

/** 404 Not Found with a JSON error body. */
export function notFound(error: string) {
  return NextResponse.json({ error }, { status: 404 });
}

/** Return a TwiML XML response (used by Twilio voice/WhatsApp webhooks). */
export function twimlResponse(xml: string) {
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

/**
 * Safely parse the JSON body of a request. Returns the parsed value on success,
 * or a NextResponse (400) on failure — callers should check with `instanceof`.
 */
export async function parseJsonBody<T>(req: Request): Promise<T | NextResponse> {
  try {
    return (await req.json()) as T;
  } catch {
    return badRequest("Invalid JSON body.");
  }
}

/**
 * Extract missionId and candidateId from the URL search params (used by Twilio
 * voice callbacks that pass context via query params).
 */
export function extractCallbackParams(req: Request) {
  const url = new URL(req.url);
  return {
    missionId: url.searchParams.get("missionId") || "",
    candidateId: url.searchParams.get("candidateId") || "",
  };
}
