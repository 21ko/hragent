import { addMissionEvent, getMission, getShortlist, updateMission } from "./db";

export function isCandidateTerminal(entry: {
  call_status: string;
  whatsapp_status: string;
}): boolean {
  if (entry.call_status === "answered") return true;
  return ["replied_yes", "replied_no", "failed"].includes(
    entry.whatsapp_status,
  );
}

/**
 * Converges a mission after every callback/simulation. Results are released
 * only when every shortlisted candidate has reached a terminal outcome.
 */
export async function reconcileMissionProgress(missionId: string) {
  const [mission, shortlist] = await Promise.all([
    getMission(missionId),
    getShortlist(missionId),
  ]);
  if (!mission || mission.status === "no_candidates") return null;

  const resolved = shortlist.filter(isCandidateTerminal).length;
  const total = shortlist.length;
  const complete = total > 0 && resolved === total;

  if (complete && mission.status !== "complete") {
    await updateMission(missionId, { status: "complete" });
    await addMissionEvent(
      missionId,
      "results_revealed",
      `${resolved}/${total} entretiens résolus — rapport final débloqué.`,
    );
  } else if (!complete && mission.status !== "awaiting_replies") {
    await updateMission(missionId, { status: "awaiting_replies" });
  }

  return { resolved, total, complete };
}
