import { NextResponse } from "next/server";
import { listMissions } from "@/lib/db";
import { checkAdminKey } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Used by the dashboard to list every mission. */
export async function GET(req: Request) {
  if (!checkAdminKey(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const missions = await listMissions();
  return NextResponse.json({ missions });
}
