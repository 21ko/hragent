import { NextResponse } from "next/server";
import { checkApiKey } from "@/lib/auth";
import { notFound, unauthorized } from "@/lib/api-helpers";
import { fetchMissionData } from "@/lib/mission-data";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/missions/:id
 * Agent-facing tool: read mission status, the priced shortlist (with outreach
 * state per candidate), and the full agent activity trace.
 */
export async function GET(
  req: Request,
  { params }: { params: { missionId: string } },
) {
  if (!checkApiKey(req)) return unauthorized();

  const data = await fetchMissionData(params.missionId);
  if (!data) return notFound("Mission not found.");

  const { mission, shortlist, events, progress } = data;
  return NextResponse.json({
    mission,
    progress,
    results_sealed: !progress.complete,
    shortlist: progress.complete ? shortlist.map((e) => ({
      rank: e.rank,
      name: e.candidate.name,
      city: e.candidate.city,
      years_experience: e.candidate.years_experience,
      suggested_rate: e.suggested_rate,
      confidence_score: e.confidence_score,
      fit: e.fit,
      rationale: e.rationale,
      call_status: e.call_status,
      whatsapp_status: e.whatsapp_status,
      outreach_channel: e.outreach_channel,
    })) : [],
    trace: events.map((ev) => ({
      step: ev.step,
      detail: ev.detail,
      at: ev.created_at,
    })),
  });
}
