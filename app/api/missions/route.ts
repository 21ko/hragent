import { NextResponse } from "next/server";
import { listMissions } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Used by the dashboard to list every mission. */
export async function GET() {
  const missions = await listMissions();
  return NextResponse.json({ missions });
}
