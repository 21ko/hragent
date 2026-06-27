import type {
  AgentEvent,
  Candidate,
  Mission,
  MissionCandidate,
} from "./types";
import { SEED_CANDIDATES } from "./seed-data";

/**
 * In-memory mock store used when Supabase env vars are absent.
 * Module-level state persists across requests within a single dev-server
 * process, which is enough for the form -> agent -> results demo loop.
 *
 * We stash it on globalThis so Next.js hot-reload doesn't wipe it.
 */
interface MockDB {
  candidates: Candidate[];
  missions: Mission[];
  missionsCandidates: MissionCandidate[];
  missionEvents: AgentEvent[];
}

const g = globalThis as unknown as { __hragentStore?: MockDB };

export function store(): MockDB {
  if (!g.__hragentStore) {
    g.__hragentStore = {
      candidates: SEED_CANDIDATES.map((c) => ({ ...c })),
      missions: [],
      missionsCandidates: [],
      missionEvents: [],
    };
  }
  return g.__hragentStore;
}
