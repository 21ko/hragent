import { extractCallbackParams, twimlResponse } from "@/lib/api-helpers";
import { getMission } from "@/lib/db";
import { hrQuestions } from "@/lib/voice";

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
  const { missionId, candidateId } = extractCallbackParams(req);
  const mission = await getMission(missionId);

  const questions = mission
    ? hrQuestions(mission)
    : ["Bonjour, merci de répondre à quelques questions."];

  const action = `/api/voice/answer?missionId=${missionId}&candidateId=${candidateId}`;
  const says = questions
    .map((q) => `<Say language="fr-FR" voice="Polly.Lea">${escapeXml(q)}</Say>`)
    .join("");

  return twimlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" language="fr-FR" speechTimeout="auto" action="${action}" method="POST">
    ${says}
    <Say language="fr-FR" voice="Polly.Lea">Répondez après le bip.</Say>
  </Gather>
  <Say language="fr-FR" voice="Polly.Lea">Nous n'avons pas reçu de réponse. Nous vous enverrons les détails par WhatsApp. Au revoir.</Say>
</Response>`);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
