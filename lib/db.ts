import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import type {
  Candidate,
  Mission,
  MissionCandidate,
  RoleType,
  ShortlistEntry,
  WhatsappStatus,
} from "./types";
import { store } from "./store";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export const usingSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let _client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

// ---------- Candidates ----------

export async function getCandidatesByRole(role: RoleType): Promise<Candidate[]> {
  if (usingSupabase) {
    const { data, error } = await sb()
      .from("candidates")
      .select("*")
      .eq("role_type", role);
    if (error) throw error;
    return (data ?? []) as Candidate[];
  }
  return store().candidates.filter((c) => c.role_type === role);
}

export async function getCandidateByPhone(
  phone: string,
): Promise<Candidate | null> {
  const normalized = normalizePhone(phone);
  if (usingSupabase) {
    const { data, error } = await sb()
      .from("candidates")
      .select("*")
      .eq("phone", normalized)
      .maybeSingle();
    if (error) throw error;
    return (data as Candidate) ?? null;
  }
  return (
    store().candidates.find((c) => normalizePhone(c.phone) === normalized) ??
    null
  );
}

// ---------- Missions ----------

export async function createMission(
  m: Omit<Mission, "id" | "created_at" | "status"> &
    Partial<Pick<Mission, "status">>,
): Promise<Mission> {
  const row: Mission = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    status: m.status ?? "pending_outreach",
    ...m,
  } as Mission;

  if (usingSupabase) {
    const { id, created_at, ...insert } = row;
    const { data, error } = await sb()
      .from("missions")
      .insert(insert)
      .select("*")
      .single();
    if (error) throw error;
    return data as Mission;
  }
  store().missions.unshift(row);
  return row;
}

export async function updateMission(
  id: string,
  patch: Partial<Mission>,
): Promise<void> {
  if (usingSupabase) {
    const { error } = await sb().from("missions").update(patch).eq("id", id);
    if (error) throw error;
    return;
  }
  const m = store().missions.find((x) => x.id === id);
  if (m) Object.assign(m, patch);
}

export async function getMission(id: string): Promise<Mission | null> {
  if (usingSupabase) {
    const { data, error } = await sb()
      .from("missions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as Mission) ?? null;
  }
  return store().missions.find((m) => m.id === id) ?? null;
}

export async function listMissions(): Promise<Mission[]> {
  if (usingSupabase) {
    const { data, error } = await sb()
      .from("missions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Mission[];
  }
  return store().missions;
}

// ---------- missions_candidates ----------

export async function insertMissionCandidates(
  rows: Array<Omit<MissionCandidate, "id" | "updated_at">>,
): Promise<void> {
  const stamped = rows.map((r) => ({
    ...r,
    id: randomUUID(),
    updated_at: new Date().toISOString(),
  }));
  if (usingSupabase) {
    const { error } = await sb().from("missions_candidates").insert(
      stamped.map(({ id, ...rest }) => rest),
    );
    if (error) throw error;
    return;
  }
  store().missionsCandidates.push(...stamped);
}

export async function getShortlist(
  missionId: string,
): Promise<ShortlistEntry[]> {
  if (usingSupabase) {
    const { data, error } = await sb()
      .from("missions_candidates")
      .select("*, candidate:candidates(*)")
      .eq("mission_id", missionId)
      .order("rank", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as ShortlistEntry[];
  }
  const s = store();
  return s.missionsCandidates
    .filter((mc) => mc.mission_id === missionId)
    .sort((a, b) => a.rank - b.rank)
    .map((mc) => ({
      ...mc,
      candidate: s.candidates.find((c) => c.id === mc.candidate_id)!,
    }))
    .filter((e) => e.candidate);
}

export async function updateWhatsappStatusByPhone(
  phone: string,
  status: WhatsappStatus,
): Promise<MissionCandidate | null> {
  const candidate = await getCandidateByPhone(phone);
  if (!candidate) return null;

  if (usingSupabase) {
    // Update the most recent pending/sent row for this candidate.
    const { data, error } = await sb()
      .from("missions_candidates")
      .update({ whatsapp_status: status, updated_at: new Date().toISOString() })
      .eq("candidate_id", candidate.id)
      .in("whatsapp_status", ["sent", "pending"])
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    return ((data?.[0] as MissionCandidate) ?? null) || null;
  }

  const rows = store()
    .missionsCandidates.filter(
      (mc) =>
        mc.candidate_id === candidate.id &&
        (mc.whatsapp_status === "sent" || mc.whatsapp_status === "pending"),
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const target = rows[0];
  if (!target) return null;
  target.whatsapp_status = status;
  target.updated_at = new Date().toISOString();
  return target;
}

export async function setMissionCandidateTwilioSid(
  missionId: string,
  candidateId: string,
  sid: string,
  status: WhatsappStatus,
): Promise<void> {
  if (usingSupabase) {
    const { error } = await sb()
      .from("missions_candidates")
      .update({ twilio_sid: sid, whatsapp_status: status })
      .eq("mission_id", missionId)
      .eq("candidate_id", candidateId);
    if (error) throw error;
    return;
  }
  const mc = store().missionsCandidates.find(
    (x) => x.mission_id === missionId && x.candidate_id === candidateId,
  );
  if (mc) {
    mc.twilio_sid = sid;
    mc.whatsapp_status = status;
  }
}

// ---------- helpers ----------

export function normalizePhone(phone: string): string {
  // Strip "whatsapp:" prefix and spaces; keep leading + and digits.
  return phone.replace(/^whatsapp:/i, "").replace(/[^\d+]/g, "");
}
