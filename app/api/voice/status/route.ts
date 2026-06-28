import { NextResponse } from "next/server";
import { addMissionEvent, updateMissionCandidate } from "@/lib/db";
import { extractCallbackParams } from "@/lib/api-helpers";
import { whatsappFallback } from "@/lib/outreach";
import { reconcileMissionProgress } from "@/lib/mission-progress";

export const dynamic = "force-dynamic";

/**
 * Twilio call status callback. When a live call ends without being answered
 * (no-answer / busy / failed), mark it and trigger the WhatsApp fallback.
 */
export async function POST(req: Request) {
  const { missionId, candidateId } = extractCallbackParams(req);

  const form = new URLSearchParams(await req.text());
  const callStatus = (form.get("CallStatus") || "").toString();

  const missed = ["no-answer", "busy", "failed", "canceled"].includes(callStatus);
  if (missionId && candidateId && missed) {
    await updateMissionCandidate(missionId, candidateId, {
      call_status: "no_answer",
    });
    await whatsappFallback(missionId, candidateId);
    await addMissionEvent(
      missionId,
      "call_no_answer",
      `Appel ${callStatus} — fallback WhatsApp déclenché.`,
    );
    await reconcileMissionProgress(missionId);
  }

  return NextResponse.json({ ok: true });
}
