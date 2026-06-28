import { NextResponse } from "next/server";
import type { JobBrief } from "@/lib/types";
import { badRequest, parseJsonBody } from "@/lib/api-helpers";
import { runMission, validateBrief } from "@/lib/run-mission";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await parseJsonBody<JobBrief>(req);
  if (parsed instanceof NextResponse) return parsed;

  const invalid = validateBrief(parsed);
  if (invalid) return badRequest(invalid);

  const result = await runMission(parsed);
  return NextResponse.json({ missionId: result.missionId });
}
