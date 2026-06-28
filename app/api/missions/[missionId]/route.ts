import { NextResponse } from "next/server";
import { getMission, getMissionEvents, getShortlist } from "@/lib/db";
import { isCandidateTerminal } from "@/lib/mission-progress";

export const dynamic = "force-dynamic";

/** Polled every 5s by the results page for live status + agent activity trace. */
export async function GET(
  _req: Request,
  { params }: { params: { missionId: string } },
) {
  try {
    const mission = await getMission(params.missionId);
    if (!mission) {
      return NextResponse.json({ error: "Mission introuvable." }, { status: 404 });
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
      shortlist: complete
        ? shortlist
        : shortlist.map((entry) => ({
            id: entry.id,
            candidate_id: entry.candidate_id,
            rank: entry.rank,
            call_status: entry.call_status,
            whatsapp_status: entry.whatsapp_status,
            outreach_channel: entry.outreach_channel,
          })),
      events,
    });
  } catch (err) {
    console.error("[api/missions/:id] failed:", err);
    return NextResponse.json(
      { error: "Erreur interne lors de la récupération de la mission." },
      { status: 500 },
    );
  }
}
