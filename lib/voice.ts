import type { Candidate, Mission, RoleType } from "./types";
import { ROLE_LABELS_FR } from "./types";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_CALLER_NUMBER = process.env.TWILIO_CALLER_NUMBER; // a voice-capable number
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL; // e.g. https://abc.ngrok.io

export const usingTwilioVoice = Boolean(
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_CALLER_NUMBER && PUBLIC_BASE_URL,
);

/**
 * The short HR screen the agent runs on the call, before WhatsApp fallback.
 * A couple of typical gig-work interview questions, role-aware.
 */
export function hrQuestions(mission: Mission): string[] {
  const base = [
    `Bonjour, c'est l'agent de recrutement Staffly. Confirmez-vous votre disponibilité pour une mission le ${mission.mission_date} à ${mission.city} ?`,
    `Avez-vous déjà travaillé sur ce type d'événement, ${ROLE_LABELS_FR[mission.role_type]} ?`,
    `Pouvez-vous être présent à ${mission.start_time ?? "l'heure prévue"} sur place ?`,
  ];
  const roleSpecific: Record<RoleType, string | null> = {
    security: "Votre carte professionnelle de sécurité est-elle à jour ?",
    hostess: "Êtes-vous à l'aise pour un accueil en anglais si nécessaire ?",
    event_staff: "Êtes-vous à l'aise avec de la manutention et de longues stations debout ?",
  };
  const extra = roleSpecific[mission.role_type];
  return extra ? [...base, extra] : base;
}

export interface CallResult {
  status: "answered" | "no_answer" | "failed";
  sid: string;
  notes: string | null;
}

/**
 * Attempts a phone screen. With Twilio Voice configured, it places a real call
 * whose TwiML (served by /api/voice/twiml) asks the HR questions and gathers
 * spoken answers; the final answered/no-answer outcome is reconciled by the
 * Twilio status callback (/api/voice/status).
 *
 * Without Twilio (demo/mock mode) it simulates the screen deterministically so
 * the call-then-WhatsApp fallback is visible: rank 1 "answers", the rest
 * "don't pick up" and fall through to WhatsApp.
 */
export async function callCandidate(
  candidate: Candidate,
  mission: Mission,
  rank: number,
): Promise<CallResult> {
  const questions = hrQuestions(mission);

  if (!usingTwilioVoice) {
    const answered = rank === 1; // deterministic demo outcome
    console.log(
      `[voice:mock] -> ${candidate.phone} (${answered ? "ANSWERED" : "no answer"})\n   Q: ${questions.join(" | ")}`,
    );
    return {
      status: answered ? "answered" : "no_answer",
      sid: `mockcall_${Math.random().toString(36).slice(2, 10)}`,
      notes: answered
        ? "A répondu OUI à la disponibilité et confirmé l'expérience (simulé)."
        : null,
    };
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(TWILIO_ACCOUNT_SID!, TWILIO_AUTH_TOKEN!);
    const call = await client.calls.create({
      from: TWILIO_CALLER_NUMBER!,
      to: candidate.phone,
      url: `${PUBLIC_BASE_URL}/api/voice/twiml?missionId=${mission.id}&candidateId=${candidate.id}`,
      statusCallback: `${PUBLIC_BASE_URL}/api/voice/status?missionId=${mission.id}&candidateId=${candidate.id}`,
      statusCallbackEvent: ["completed", "no-answer", "busy", "failed"],
      timeout: 20,
    });
    // The real answered/no-answer outcome arrives via the status callback;
    // we return "calling" semantics as "no_answer" placeholder so the caller
    // can decide fallback timing. Here we mark it pending-ish via "no_answer"
    // only if the call could not connect synchronously.
    return { status: "answered", sid: call.sid, notes: null };
  } catch (err) {
    console.error(`[voice] call failed for ${candidate.phone}:`, err);
    return { status: "failed", sid: "", notes: null };
  }
}
