import type {
  AgentEvent,
  Candidate,
  Mission,
  MissionCandidate,
} from "./types";
import { SEED_CANDIDATES } from "./seed-data";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

/**
 * Persistent local JSON database used when Supabase is absent. The in-memory
 * object remains the request-time cache; every mutation is flushed to disk so
 * localhost missions survive dev-server restarts.
 */
export interface LocalDB {
  candidates: Candidate[];
  missions: Mission[];
  missionsCandidates: MissionCandidate[];
  missionEvents: AgentEvent[];
}

const g = globalThis as unknown as { __hragentStore?: LocalDB };
const LOCAL_DB_PATH =
  process.env.STAFFLY_LOCAL_DB_PATH ||
  join(process.cwd(), ".staffly", "local-db.json");

export function store(): LocalDB {
  if (!g.__hragentStore) {
    g.__hragentStore = loadLocalDB();
  }
  return g.__hragentStore;
}

export function persistStore(): void {
  const db = store();
  mkdirSync(dirname(LOCAL_DB_PATH), { recursive: true });
  writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function loadLocalDB(): LocalDB {
  if (existsSync(LOCAL_DB_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(LOCAL_DB_PATH, "utf8")) as Partial<LocalDB>;
      if (
        Array.isArray(parsed.candidates) &&
        Array.isArray(parsed.missions) &&
        Array.isArray(parsed.missionsCandidates) &&
        Array.isArray(parsed.missionEvents)
      ) {
        return parsed as LocalDB;
      }
      console.warn("[local-db] Invalid shape; starting with a fresh database.");
    } catch (error) {
      console.warn("[local-db] Could not read database; starting fresh:", error);
    }
  }

  const fresh: LocalDB = {
    candidates: SEED_CANDIDATES.map((candidate) => ({ ...candidate })),
    missions: [],
    missionsCandidates: [],
    missionEvents: [],
  };
  mkdirSync(dirname(LOCAL_DB_PATH), { recursive: true });
  writeFileSync(LOCAL_DB_PATH, JSON.stringify(fresh, null, 2), "utf8");
  return fresh;
}
