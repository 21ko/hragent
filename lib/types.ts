export type RoleType = "hostess" | "security" | "event_staff";

export type MissionStatus =
  | "pending_outreach"
  | "awaiting_replies"
  | "complete"
  | "no_candidates";

export type WhatsappStatus =
  | "pending"
  | "sent"
  | "replied_yes"
  | "replied_no"
  | "failed";

/** Phone-call outreach state (the agent calls before falling back to WhatsApp). */
export type CallStatus =
  | "pending" // not attempted yet
  | "calling" // dial in progress
  | "answered" // candidate picked up and answered the HR questions
  | "no_answer" // rang out / busy -> WhatsApp fallback
  | "failed"; // could not place the call -> WhatsApp fallback

/** How the agent ultimately reached (or tried to reach) the candidate. */
export type OutreachChannel = "call" | "whatsapp" | null;

export interface Candidate {
  id: string;
  name: string;
  phone: string;
  role_type: RoleType;
  years_experience: number;
  day_rate: number;
  city: string;
  languages: string[];
  availability_status: string;
  notes: string;
  created_at?: string;
}

export interface Mission {
  id: string;
  role_type: RoleType;
  people_needed: number;
  mission_date: string; // ISO date (YYYY-MM-DD)
  start_time: string | null;
  end_time: string | null;
  city: string;
  max_budget_per_person: number;
  description: string;
  status: MissionStatus;
  pricing_summary: string | null;
  mission_brief_fr: string | null;
  no_candidates_reason: string | null;
  created_at: string;
}

export interface MissionCandidate {
  id: string;
  mission_id: string;
  candidate_id: string;
  rank: number;
  rationale: string;
  suggested_rate: number;
  confidence_score: number;
  call_status: CallStatus;
  call_notes: string | null;
  outreach_channel: OutreachChannel;
  whatsapp_status: WhatsappStatus;
  twilio_sid: string | null;
  updated_at: string;
}

/** A row joined with its candidate, used by the results page. */
export interface ShortlistEntry extends MissionCandidate {
  candidate: Candidate;
}

/** One step the agent took, surfaced as a live activity trace (proof of autonomy). */
export interface AgentEvent {
  id: string;
  mission_id: string;
  step: string; // e.g. brief_parsed, ranked, call_answered, whatsapp_sent
  detail: string;
  created_at: string;
}

/** Shape returned by the agent (Claude or mock) before persistence. */
export interface AgentShortlistItem {
  candidate_id: string;
  name: string;
  rank: number;
  rationale: string;
  suggested_rate: number;
  confidence_score: number;
}

export interface AgentResult {
  shortlist: AgentShortlistItem[];
  pricing_summary: string;
  mission_brief_fr: string;
  /** Set when the agent finds nobody eligible; shortlist is then empty. */
  no_candidates_reason: string | null;
}

/** Payload submitted by the intake form. */
export interface JobBrief {
  role_type: RoleType;
  people_needed: number;
  mission_date: string;
  start_time: string;
  end_time: string;
  city: string;
  max_budget_per_person: number;
  description: string;
}

export const ROLE_LABELS_FR: Record<RoleType, string> = {
  hostess: "Hôtesse",
  security: "Agent de sécurité",
  event_staff: "Staff événementiel",
};
