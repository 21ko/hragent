import { NextResponse } from "next/server";
import { getMission, getShortlist } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Polled every 5s by the results page for live WhatsApp status updates. */
export async function GET(
  _req: Request,
  { params }: { params: { missionId: string } },
) {
  const mission = await getMission(params.missionId);
  if (!mission) {
    return NextResponse.json({ error: "Mission introuvable." }, { status: 404 });
  }
  const shortlist = await getShortlist(params.missionId);
  return NextResponse.json({ mission, shortlist });
}
