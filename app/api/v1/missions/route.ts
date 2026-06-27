import { NextResponse } from "next/server";
import type { JobBrief } from "@/lib/types";
import { checkApiKey } from "@/lib/auth";
import { runMission, validateBrief } from "@/lib/run-mission";
import { listMissions } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/missions
 * Agent-facing tool: create + run a staffing mission from a brief. Returns the
 * mission id, status, and (when found) how many candidates were shortlisted.
 */
export async function POST(req: Request) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  let brief: JobBrief;
  try {
    brief = (await req.json()) as JobBrief;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const invalid = validateBrief(brief);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const result = await runMission(brief);
  return NextResponse.json({
    mission_id: result.missionId,
    status: result.status,
    shortlisted: result.shortlistCount,
    no_candidates_reason: result.no_candidates_reason,
    result_url: `/api/v1/missions/${result.missionId}`,
  });
}

/** GET /api/v1/missions — list all missions. */
export async function GET(req: Request) {
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const missions = await listMissions();
  return NextResponse.json({ missions });
}
