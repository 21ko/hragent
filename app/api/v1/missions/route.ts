import { NextResponse } from "next/server";
import type { JobBrief } from "@/lib/types";
import { checkApiKey } from "@/lib/auth";
import { badRequest, parseJsonBody, unauthorized } from "@/lib/api-helpers";
import { runMission, validateBrief } from "@/lib/run-mission";
import { listMissions } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/missions
 * Agent-facing tool: create + run a staffing mission from a brief. Returns the
 * mission id, status, and (when found) how many candidates were shortlisted.
 */
export async function POST(req: Request) {
  if (!checkApiKey(req)) return unauthorized();

  const parsed = await parseJsonBody<JobBrief>(req);
  if (parsed instanceof NextResponse) return parsed;

  const invalid = validateBrief(parsed);
  if (invalid) return badRequest(invalid);

  const result = await runMission(parsed);
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
  if (!checkApiKey(req)) return unauthorized();
  const missions = await listMissions();
  return NextResponse.json({ missions });
}
