import { NextResponse } from "next/server";
import type { JobBrief, MissionCandidate, RoleType } from "@/lib/types";
import {
  createMission,
  getCandidatesByRole,
  insertMissionCandidates,
  updateMission,
  updateMissionCandidate,
} from "@/lib/db";
import { runAgent } from "@/lib/agent";
import { sendWhatsApp } from "@/lib/whatsapp";
import { callCandidate } from "@/lib/voice";

export const dynamic = "force-dynamic";

const VALID_ROLES: RoleType[] = ["hostess", "security", "event_staff"];

export async function POST(req: Request) {
  let brief: JobBrief;
  try {
    brief = (await req.json()) as JobBrief;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  if (!VALID_ROLES.includes(brief.role_type)) {
    return NextResponse.json(
      { error: "Type de poste invalide." },
      { status: 400 },
    );
  }
  if (!brief.mission_date || !brief.city) {
    return NextResponse.json(
      { error: "Date et ville sont requis." },
      { status: 400 },
    );
  }

  // a) candidates for this role
  const candidates = await getCandidatesByRole(brief.role_type);

  // b) the agent: rank + price + brief (or report no eligible candidates)
  const result = await runAgent(brief, candidates);

  // c) persist the mission
  const hasCandidates = result.shortlist.length > 0;
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

  // No eligible candidates: stop here, the agent reports why.
  if (!hasCandidates) {
    return NextResponse.json({ missionId: mission.id });
  }

  // d) persist the shortlist (top 5)
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

  // e) Outreach to the top 3: CALL first, fall back to WhatsApp on no answer.
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const top3 = result.shortlist.slice(0, 3);
  await Promise.all(
    top3.map(async (s, idx) => {
      const candidate = byId.get(s.candidate_id);
      if (!candidate) return;

      // 1) phone screen
      const call = await callCandidate(candidate, mission, idx + 1);
      await updateMissionCandidate(mission.id, s.candidate_id, {
        call_status: call.status,
        call_notes: call.notes,
        outreach_channel: call.status === "answered" ? "call" : null,
        whatsapp_status:
          call.status === "answered" ? "replied_yes" : "pending",
      });

      if (call.status === "answered") return; // reached by phone, no need to text

      // 2) WhatsApp fallback
      const { sid, ok } = await sendWhatsApp(candidate, mission, s.suggested_rate);
      await updateMissionCandidate(mission.id, s.candidate_id, {
        twilio_sid: sid,
        whatsapp_status: ok ? "sent" : "failed",
        outreach_channel: ok ? "whatsapp" : null,
      });
    }),
  );

  // f) mission now awaiting replies
  await updateMission(mission.id, { status: "awaiting_replies" });

  return NextResponse.json({ missionId: mission.id });
}
