import { NextResponse } from "next/server";
import { addMissionEvent, updateMissionCandidate } from "@/lib/db";
import { whatsappFallback } from "@/lib/outreach";
import { reconcileMissionProgress } from "@/lib/mission-progress";

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
    outcome?: "answered" | "no_answer" | "replied_yes" | "replied_no";
  };
  const { missionId, candidateId, outcome } = body;
  if (!missionId || !candidateId || !outcome) {
    return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  }

  try {
    if (outcome === "answered") {
      await updateMissionCandidate(missionId, candidateId, {
        call_status: "answered",
        call_notes:
          "A confirmé sa disponibilité et son expérience par téléphone (simulé).",
        outreach_channel: "call",
        whatsapp_status: "replied_yes",
      });
      await addMissionEvent(
        missionId,
        "call_answered",
        "Entretien téléphonique validé (mode démo).",
      );
    } else if (outcome === "no_answer") {
      await updateMissionCandidate(missionId, candidateId, {
        call_status: "no_answer",
      });
      await whatsappFallback(missionId, candidateId);
      await addMissionEvent(
        missionId,
        "whatsapp_sent",
        "Appel sans réponse — fallback WhatsApp déclenché.",
      );
    } else {
      await updateMissionCandidate(missionId, candidateId, {
        whatsapp_status: outcome,
        outreach_channel: "whatsapp",
      });
      await addMissionEvent(
        missionId,
        outcome,
        outcome === "replied_yes"
          ? "Disponibilité confirmée par WhatsApp (mode démo)."
          : "Mission déclinée par WhatsApp (mode démo).",
      );
    }

    const progress = await reconcileMissionProgress(missionId);
    return NextResponse.json({ ok: true, progress });
  } catch (err) {
    console.error("[voice/simulate] simulation failed:", err);
    return NextResponse.json(
      { error: "Erreur interne lors de la simulation." },
      { status: 500 },
    );
  }
}
