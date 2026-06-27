import { NextResponse } from "next/server";
import { manifest } from "@/lib/manifest";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/manifest
 * Public tool manifest so an external agent can self-discover Staffly's tools
 * (OpenAI/Anthropic function schemas + MCP tool list). No auth required to read.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  return NextResponse.json(manifest(baseUrl));
}
