import { NextResponse } from "next/server";
import { listMissions } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Used by the dashboard to list every mission. */
export async function GET() {
  try {
    const missions = await listMissions();
    return NextResponse.json({ missions });
  } catch (err) {
    console.error("[api/missions] listMissions failed:", err);
    return NextResponse.json(
      { error: "Erreur interne lors de la récupération des missions." },
      { status: 500 },
    );
  }
}
