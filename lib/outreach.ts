import { getMission, getShortlist, updateMissionCandidate } from "./db";
import { sendWhatsApp } from "./whatsapp";

/**
 * Sends the WhatsApp fallback for a candidate whose phone screen went
 * unanswered, and records the result. Used by the Twilio status callback and
 * the demo simulate route. No-op if the mission/candidate can't be found.
 */
export async function whatsappFallback(
  missionId: string,
  candidateId: string,
): Promise<void> {
  const mission = await getMission(missionId);
  if (!mission) return;
  const shortlist = await getShortlist(missionId);
  const entry = shortlist.find((e) => e.candidate_id === candidateId);
  if (!entry) return;

  // Don't double-send if WhatsApp already went out.
  if (entry.whatsapp_status === "sent" || entry.whatsapp_status === "replied_yes") {
    return;
  }

  const { sid, ok } = await sendWhatsApp(
    entry.candidate,
    mission,
    entry.suggested_rate,
  );
  await updateMissionCandidate(missionId, candidateId, {
    twilio_sid: sid,
    whatsapp_status: ok ? "sent" : "failed",
    outreach_channel: ok ? "whatsapp" : null,
  });
}
