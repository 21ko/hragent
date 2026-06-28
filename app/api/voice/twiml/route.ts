import { NextResponse } from "next/server";
import { getMission } from "@/lib/db";
import { hrQuestions } from "@/lib/voice";
import { validateTwilioSignatureUrl } from "@/lib/twilio-verify";

export const dynamic = "force-dynamic";

/**
 * TwiML served to Twilio when a candidate picks up. It speaks the gig-work HR
 * questions in French and gathers spoken answers, posting them to /api/voice/answer.
 */
export async function POST(req: Request) {
  return twiml(req);
}
export async function GET(req: Request) {
  return twiml(req);
}

async function twiml(req: Request) {
  if (!validateTwilioSignatureUrl(req)) {
    return NextResponse.json(
      { error: "Invalid Twilio signature." },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const missionId = sanitizeId(url.searchParams.get("missionId") || "");
  const candidateId = sanitizeId(url.searchParams.get("candidateId") || "");
  const mission = await getMission(missionId);

  const questions = mission
    ? hrQuestions(mission)
    : ["Bonjour, merci de répondre à quelques questions."];

  const action = `/api/voice/answer?missionId=${encodeURIComponent(missionId)}&candidateId=${encodeURIComponent(candidateId)}`;
  const says = questions
    .map((q) => `<Say language="fr-FR" voice="Polly.Lea">${escapeXml(q)}</Say>`)
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" language="fr-FR" speechTimeout="auto" action="${escapeXml(action)}" method="POST">
    ${says}
    <Say language="fr-FR" voice="Polly.Lea">Répondez après le bip.</Say>
  </Gather>
  <Say language="fr-FR" voice="Polly.Lea">Nous n'avons pas reçu de réponse. Nous vous enverrons les détails par WhatsApp. Au revoir.</Say>
</Response>`;

  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

/** Strip anything that isn't a UUID character to prevent injection. */
function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9\-]/g, "");
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
