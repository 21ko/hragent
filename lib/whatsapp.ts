import type { Candidate, Mission } from "./types";
import { roleLabel } from "./types";
import { getTwilioClient, hasTwilioCredentials } from "./twilio-client";

const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

export const usingTwilio = Boolean(
  hasTwilioCredentials && TWILIO_WHATSAPP_NUMBER,
);

export function buildMessage(
  candidate: Candidate,
  mission: Mission,
  rate: number,
): string {
  const role = roleLabel(mission.role_type);
  return `Bonjour ${candidate.name} 👋 Mission disponible : ${role} le ${mission.mission_date} à ${mission.city}, ${rate}€/jour. Disponible ? Répondez OUI ou NON`;
}

export interface SendResult {
  sid: string;
  ok: boolean;
}

/**
 * Sends a WhatsApp message via the Twilio sandbox when configured, otherwise
 * logs the message and returns a fake sid so the demo flow still completes.
 */
export async function sendWhatsApp(
  candidate: Candidate,
  mission: Mission,
  rate: number,
): Promise<SendResult> {
  const body = buildMessage(candidate, mission, rate);

  if (!usingTwilio) {
    console.log(
      `[whatsapp:mock] -> ${candidate.phone}\n   ${body}\n   (set TWILIO_* env vars to send for real)`,
    );
    return { sid: `mock_${Math.random().toString(36).slice(2, 10)}`, ok: true };
  }

  try {
    const client = await getTwilioClient();
    const msg = await client.messages.create({
      from: prefixWhatsapp(TWILIO_WHATSAPP_NUMBER!),
      to: prefixWhatsapp(candidate.phone),
      body,
    });
    return { sid: msg.sid, ok: true };
  } catch (err) {
    console.error(`[whatsapp] send failed for ${candidate.phone}:`, err);
    return { sid: "", ok: false };
  }
}

function prefixWhatsapp(num: string): string {
  return num.startsWith("whatsapp:") ? num : `whatsapp:${num}`;
}
