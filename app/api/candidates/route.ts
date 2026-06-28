import { NextResponse } from "next/server";
import { listCandidates } from "@/lib/db";
import { checkAdminKey } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const candidates = await listCandidates();
  return NextResponse.json({ candidates });
}
