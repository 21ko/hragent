import { NextResponse } from "next/server";
import { getMission, getMissionEvents, getShortlist } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Polled every 5s by the results page for live status + agent activity trace. */
export async function GET(
  _req: Request,
  { params }: { params: { missionId: string } },
) {
  const mission = await getMission(params.missionId);
  if (!mission) {
    return NextResponse.json({ error: "Mission introuvable." }, { status: 404 });
  }
  const [shortlist, events] = await Promise.all([
    getShortlist(params.missionId),
    getMissionEvents(params.missionId),
  ]);
  return NextResponse.json({ mission, shortlist, events });
}
