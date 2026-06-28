/**
 * Shared mission data assembly — the pattern of fetching mission + shortlist +
 * events and computing progress is used by both /api/missions/[id] and
 * /api/v1/missions/[id].
 */

import { getMission, getMissionEvents, getShortlist } from "./db";
import { isCandidateTerminal } from "./mission-progress";
import type { AgentEvent, Mission, ShortlistEntry } from "./types";

export interface MissionProgress {
  resolved: number;
  total: number;
  complete: boolean;
}

export interface MissionData {
  mission: Mission;
  shortlist: ShortlistEntry[];
  events: AgentEvent[];
  progress: MissionProgress;
}

/**
 * Fetch all data for a single mission (shortlist + events + computed progress).
 * Returns null if the mission doesn't exist.
 */
export async function fetchMissionData(
  missionId: string,
): Promise<MissionData | null> {
  const mission = await getMission(missionId);
  if (!mission) return null;

  const [shortlist, events] = await Promise.all([
    getShortlist(missionId),
    getMissionEvents(missionId),
  ]);

  const resolved = shortlist.filter(isCandidateTerminal).length;
  const complete = mission.status === "complete";

  return {
    mission,
    shortlist,
    events,
    progress: { resolved, total: shortlist.length, complete },
  };
}
