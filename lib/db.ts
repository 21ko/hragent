import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import type {
  AgentEvent,
  Candidate,
  Mission,
  MissionCandidate,
  RoleType,
  ShortlistEntry,
  WhatsappStatus,
} from "./types";
import { persistStore, store } from "./store";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVER_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

export const usingSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVER_KEY);

let _client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL!, SUPABASE_SERVER_KEY!, {
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
    if (data?.length) return data as Candidate[];
    const { data: pool, error: poolError } = await sb()
      .from("candidates")
      .select("*")
      .eq("availability_status", "available");
    if (poolError) throw poolError;
    return (pool ?? []) as Candidate[];
  }
  const exact = store().candidates.filter((c) => c.role_type === role);
  return exact.length
    ? exact
    : store().candidates.filter((c) => c.availability_status === "available");
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

export async function listCandidates(): Promise<Candidate[]> {
  if (usingSupabase) {
    const { data, error } = await sb()
      .from("candidates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Candidate[];
  }
  return [...store().candidates].sort((a, b) =>
    String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
  );
}

export async function insertCandidates(
  candidates: Array<Omit<Candidate, "id" | "created_at">>,
): Promise<{ inserted: number; updated: number }> {
  let inserted = 0;
  let updated = 0;

  for (const candidate of candidates) {
    const existing = await getCandidateByPhone(candidate.phone);
    if (usingSupabase) {
      if (existing) {
        const { error } = await sb()
          .from("candidates")
          .update(candidate)
          .eq("id", existing.id);
        if (error) throw error;
        updated += 1;
      } else {
        const { error } = await sb().from("candidates").insert(candidate);
        if (error) throw error;
        inserted += 1;
      }
      continue;
    }

    if (existing) {
      Object.assign(existing, candidate);
      updated += 1;
    } else {
      store().candidates.unshift({
        ...candidate,
        id: randomUUID(),
        created_at: new Date().toISOString(),
      });
      inserted += 1;
    }
  }

  if (!usingSupabase && candidates.length) persistStore();
  return { inserted, updated };
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
  persistStore();
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
  if (m) {
    Object.assign(m, patch);
    persistStore();
  }
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
  persistStore();
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
  persistStore();
  return target;
}

/** General patch for one mission_candidate row (call/whatsapp status, channel…). */
export async function updateMissionCandidate(
  missionId: string,
  candidateId: string,
  patch: Partial<MissionCandidate>,
): Promise<void> {
  const stamped = { ...patch, updated_at: new Date().toISOString() };
  if (usingSupabase) {
    const { error } = await sb()
      .from("missions_candidates")
      .update(stamped)
      .eq("mission_id", missionId)
      .eq("candidate_id", candidateId);
    if (error) throw error;
    return;
  }
  const mc = store().missionsCandidates.find(
    (x) => x.mission_id === missionId && x.candidate_id === candidateId,
  );
  if (mc) {
    Object.assign(mc, stamped);
    persistStore();
  }
}

// ---------- mission_events (agent activity trace) ----------

export async function addMissionEvent(
  missionId: string,
  step: string,
  detail = "",
): Promise<void> {
  const row: AgentEvent = {
    id: randomUUID(),
    mission_id: missionId,
    step,
    detail,
    created_at: new Date().toISOString(),
  };
  if (usingSupabase) {
    const { id, ...insert } = row;
    const { error } = await sb().from("mission_events").insert(insert);
    if (error) throw error;
    return;
  }
  store().missionEvents.push(row);
  persistStore();
}

export async function getMissionEvents(
  missionId: string,
): Promise<AgentEvent[]> {
  if (usingSupabase) {
    const { data, error } = await sb()
      .from("mission_events")
      .select("*")
      .eq("mission_id", missionId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as AgentEvent[];
  }
  return store()
    .missionEvents.filter((e) => e.mission_id === missionId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// ---------- helpers ----------

export function normalizePhone(phone: string): string {
  // Strip "whatsapp:" prefix and spaces; keep leading + and digits.
  return phone.replace(/^whatsapp:/i, "").replace(/[^\d+]/g, "");
}
