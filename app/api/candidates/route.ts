import { NextResponse } from "next/server";
import { listCandidates } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const candidates = await listCandidates();
  return NextResponse.json({ candidates });
}
