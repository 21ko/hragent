import type { Candidate, Mission } from "./types";
import { ROLE_LABELS_FR } from "./types";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

export const usingTwilio = Boolean(
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_NUMBER,
);

export function buildMessage(
  candidate: Candidate,
  mission: Mission,
  rate: number,
): string {
  const role = ROLE_LABELS_FR[mission.role_type];
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
    // Lazy import so the dependency isn't required when running on mock.
    const twilio = (await import("twilio")).default;
    const client = twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!);
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
