import { NextResponse } from "next/server";
import { updateMissionCandidate } from "@/lib/db";
import { whatsappFallback } from "@/lib/outreach";

export const dynamic = "force-dynamic";

/**
 * Demo helper for the results page: simulate a phone-screen outcome without a
 * real call. `outcome: "answered"` marks the candidate reached by phone;
 * `outcome: "no_answer"` triggers the WhatsApp fallback.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    missionId?: string;
    candidateId?: string;
    outcome?: "answered" | "no_answer";
  };
  const { missionId, candidateId, outcome } = body;
  if (!missionId || !candidateId || !outcome) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  if (outcome === "answered") {
    await updateMissionCandidate(missionId, candidateId, {
      call_status: "answered",
      call_notes:
        "A confirmé sa disponibilité et son expérience par téléphone (simulé).",
      outreach_channel: "call",
      whatsapp_status: "replied_yes",
    });
  } else {
    await updateMissionCandidate(missionId, candidateId, {
      call_status: "no_answer",
    });
    await whatsappFallback(missionId, candidateId);
  }

  return NextResponse.json({ ok: true });
}
