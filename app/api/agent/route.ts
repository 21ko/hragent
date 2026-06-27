import { NextResponse } from "next/server";
import type { JobBrief } from "@/lib/types";
import { runMission, validateBrief } from "@/lib/run-mission";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let brief: JobBrief;
  try {
    brief = (await req.json()) as JobBrief;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const invalid = validateBrief(brief);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  const result = await runMission(brief);
  return NextResponse.json({ missionId: result.missionId });
}
