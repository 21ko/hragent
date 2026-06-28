import { NextResponse } from "next/server";
import { listCandidates } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const candidates = await listCandidates();
    return NextResponse.json({ candidates });
  } catch (err) {
    console.error("[api/candidates] listCandidates failed:", err);
    return NextResponse.json(
      { error: "Erreur interne lors de la récupération des candidats." },
      { status: 500 },
    );
  }
}
