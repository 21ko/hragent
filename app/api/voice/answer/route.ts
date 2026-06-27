import { NextResponse } from "next/server";
import { updateMissionCandidate } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Twilio posts the gathered speech here (field `SpeechResult`). We record it as
 * the candidate's answer and mark the call answered.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const missionId = url.searchParams.get("missionId") || "";
  const candidateId = url.searchParams.get("candidateId") || "";

  const form = new URLSearchParams(await req.text());
  const speech = (form.get("SpeechResult") || "").toString().trim();

  if (missionId && candidateId) {
    await updateMissionCandidate(missionId, candidateId, {
      call_status: "answered",
      call_notes: speech || "Réponse reçue par téléphone.",
      outreach_channel: "call",
      whatsapp_status: "replied_yes",
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="Polly.Lea">Merci pour vos réponses. Nous revenons vers vous très vite. Au revoir.</Say>
</Response>`;
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
