import { NextResponse } from "next/server";
import { notFound } from "@/lib/api-helpers";
import { fetchMissionData } from "@/lib/mission-data";

export const dynamic = "force-dynamic";

/** Polled every 5s by the results page for live status + agent activity trace. */
export async function GET(
  _req: Request,
  { params }: { params: { missionId: string } },
) {
  const data = await fetchMissionData(params.missionId);
  if (!data) return notFound("Mission introuvable.");

  const { mission, shortlist, events, progress } = data;
  return NextResponse.json({
    mission,
    progress,
    shortlist: progress.complete
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
}
