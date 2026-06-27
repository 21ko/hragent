import { NextResponse } from "next/server";
import { updateMissionCandidate } from "@/lib/db";
import { whatsappFallback } from "@/lib/outreach";

export const dynamic = "force-dynamic";

/**
 * Twilio call status callback. When a live call ends without being answered
 * (no-answer / busy / failed), mark it and trigger the WhatsApp fallback.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const missionId = url.searchParams.get("missionId") || "";
  const candidateId = url.searchParams.get("candidateId") || "";

  const form = new URLSearchParams(await req.text());
  const callStatus = (form.get("CallStatus") || "").toString();

  const missed = ["no-answer", "busy", "failed", "canceled"].includes(callStatus);
  if (missionId && candidateId && missed) {
    await updateMissionCandidate(missionId, candidateId, {
      call_status: "no_answer",
    });
    await whatsappFallback(missionId, candidateId);
  }

  return NextResponse.json({ ok: true });
}
