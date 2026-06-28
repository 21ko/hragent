import { NextResponse } from "next/server";
import { checkApiKey } from "@/lib/auth";
import { getMission, getMissionEvents, getShortlist } from "@/lib/db";
import { isCandidateTerminal } from "@/lib/mission-progress";

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
  if (!checkApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const mission = await getMission(params.missionId);
    if (!mission) {
      return NextResponse.json({ error: "Mission not found." }, { status: 404 });
    }
    const [shortlist, events] = await Promise.all([
      getShortlist(params.missionId),
      getMissionEvents(params.missionId),
    ]);

    const resolved = shortlist.filter(isCandidateTerminal).length;
    const complete = mission.status === "complete";
    return NextResponse.json({
      mission,
      progress: { resolved, total: shortlist.length, complete },
      results_sealed: !complete,
      shortlist: complete ? shortlist.map((e) => ({
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
  } catch (err) {
    console.error("[api/v1/missions/:id] failed:", err);
    return NextResponse.json(
      { error: "Internal error while fetching mission." },
      { status: 500 },
    );
  }
}
