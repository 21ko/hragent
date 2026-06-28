import type { JobBrief, Mission, MissionCandidate, RoleType } from "./types";
import { ROLE_LABELS_FR } from "./types";
import {
  addMissionEvent,
  createMission,
  getCandidatesByRole,
  insertMissionCandidates,
  updateMission,
  updateMissionCandidate,
} from "./db";
import { runAgent } from "./agent";
import { sendWhatsApp } from "./whatsapp";
import { callCandidate } from "./voice";
import { reconcileMissionProgress } from "./mission-progress";

export const VALID_ROLES: RoleType[] = ["hostess", "security", "event_staff"];

export interface RunMissionResult {
  missionId: string;
  status: Mission["status"];
  shortlistCount: number;
  no_candidates_reason: string | null;
}

/**
 * The full autonomous agent loop, shared by the web form (/api/agent) and the
 * external-agent plugin API (/api/v1/missions). Each step is recorded as an
 * AgentEvent so the autonomy is provable / inspectable.
 */
export async function runMission(brief: JobBrief): Promise<RunMissionResult> {
  // 1) candidates for this role
  const candidates = await getCandidatesByRole(brief.role_type);

  // 2) the agent reasons: rank + price + brief (or reports no eligible candidates)
  const result = await runAgent(brief, candidates);
  const hasCandidates = result.shortlist.length > 0;

  // 3) persist the mission
  const mission = await createMission({
    role_type: brief.role_type,
    people_needed: Number(brief.people_needed) || 1,
    mission_date: brief.mission_date,
    start_time: brief.start_time || null,
    end_time: brief.end_time || null,
    city: brief.city,
    max_budget_per_person: Number(brief.max_budget_per_person) || 0,
    description: brief.description || "",
    pricing_summary: result.pricing_summary || null,
    mission_brief_fr: result.mission_brief_fr || null,
    no_candidates_reason: result.no_candidates_reason || null,
    status: hasCandidates ? "pending_outreach" : "no_candidates",
  });

  await addMissionEvent(
    mission.id,
    "brief_parsed",
    `Brief reçu: ${ROLE_LABELS_FR[brief.role_type]} × ${brief.people_needed} à ${brief.city} le ${brief.mission_date}.`,
  );
  await addMissionEvent(
    mission.id,
    "candidates_fetched",
    `${candidates.length} candidat(s) ${ROLE_LABELS_FR[brief.role_type].toLowerCase()} dans la base.`,
  );

  // No eligible candidates: stop here with a recorded reason.
  if (!hasCandidates) {
    await addMissionEvent(
      mission.id,
      "no_candidates",
      result.no_candidates_reason || "Aucun candidat éligible.",
    );
    return {
      missionId: mission.id,
      status: "no_candidates",
      shortlistCount: 0,
      no_candidates_reason: result.no_candidates_reason || null,
    };
  }

  await addMissionEvent(
    mission.id,
    "ranked",
    `Top ${result.shortlist.length} sélectionné(s): ${result.shortlist.map((s) => `${s.name} (${s.suggested_rate}€)`).join(", ")}.`,
  );

  // 4) persist the shortlist
  const rows: Array<Omit<MissionCandidate, "id" | "updated_at">> =
    result.shortlist.map((s) => ({
      mission_id: mission.id,
      candidate_id: s.candidate_id,
      rank: s.rank,
      rationale: s.rationale,
      suggested_rate: s.suggested_rate,
      confidence_score: s.confidence_score,
      call_status: "pending",
      call_notes: null,
      outreach_channel: null,
      whatsapp_status: "pending",
      twilio_sid: null,
    }));
  await insertMissionCandidates(rows);

  // 5) outreach: CALL first, fall back to WhatsApp on no answer
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const interviewCohort = result.shortlist.slice(0, 5);
  await Promise.all(
    interviewCohort.map(async (s, idx) => {
      const candidate = byId.get(s.candidate_id);
      if (!candidate) return;

      const call = await callCandidate(candidate, mission, idx + 1);
      await updateMissionCandidate(mission.id, s.candidate_id, {
        call_status: call.status,
        call_notes: call.notes,
        outreach_channel: call.status === "answered" ? "call" : null,
        whatsapp_status: call.status === "answered" ? "replied_yes" : "pending",
        twilio_sid: call.sid || null,
      });

      if (call.status === "answered") {
        await addMissionEvent(
          mission.id,
          "call_answered",
          `${candidate.name} a répondu à l'appel et passé le screen RH.`,
        );
        return;
      }

      if (call.status === "calling") {
        await addMissionEvent(
          mission.id,
          "call_started",
          `Appel de ${candidate.name} lancé — résultat en attente du callback.`,
        );
        return;
      }

      await addMissionEvent(
        mission.id,
        "call_no_answer",
        `${candidate.name} n'a pas répondu — bascule WhatsApp.`,
      );
      const { sid, ok } = await sendWhatsApp(candidate, mission, s.suggested_rate);
      await updateMissionCandidate(mission.id, s.candidate_id, {
        twilio_sid: sid,
        whatsapp_status: ok ? "sent" : "failed",
        outreach_channel: ok ? "whatsapp" : null,
      });
      await addMissionEvent(
        mission.id,
        ok ? "whatsapp_sent" : "whatsapp_failed",
        ok
          ? `Message WhatsApp envoyé à ${candidate.name}.`
          : `Échec de l'envoi WhatsApp à ${candidate.name}.`,
      );
    }),
  );

  await updateMission(mission.id, { status: "awaiting_replies" });
  await addMissionEvent(
    mission.id,
    "awaiting_replies",
    "Outreach terminé — en attente des réponses.",
  );
  await reconcileMissionProgress(mission.id);

  return {
    missionId: mission.id,
    status: "awaiting_replies",
    shortlistCount: result.shortlist.length,
    no_candidates_reason: null,
  };
}

export function validateBrief(brief: Partial<JobBrief>): string | null {
  if (!brief.role_type || !VALID_ROLES.includes(brief.role_type)) {
    return "role_type invalide (hostess | security | event_staff).";
  }
  if (!brief.mission_date) return "mission_date requis (YYYY-MM-DD).";
  if (!brief.city) return "city requis.";
  return null;
}
