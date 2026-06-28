import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "path";
import { existsSync, rmSync, mkdirSync } from "fs";

/**
 * Tests for the in-memory (mock) store path of db.ts.
 * We set STAFFLY_LOCAL_DB_PATH to a temp location so tests don't interfere
 * with the dev database, and ensure no Supabase env vars are set.
 */

const TEST_DB_DIR = join(process.cwd(), ".staffly-test");
const TEST_DB_PATH = join(TEST_DB_DIR, "test-db.json");

beforeEach(() => {
  // Force clean store for each test
  process.env.STAFFLY_LOCAL_DB_PATH = TEST_DB_PATH;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;

  // Clean the globalThis store cache
  const g = globalThis as unknown as { __hragentStore?: unknown };
  delete g.__hragentStore;

  if (existsSync(TEST_DB_DIR)) {
    rmSync(TEST_DB_DIR, { recursive: true });
  }
});

afterEach(() => {
  if (existsSync(TEST_DB_DIR)) {
    rmSync(TEST_DB_DIR, { recursive: true });
  }
  delete process.env.STAFFLY_LOCAL_DB_PATH;
});

describe("store (in-memory mock DB)", () => {
  it("initializes with seed candidates", async () => {
    // Dynamic import to pick up env var
    const { store } = await import("../lib/store");
    const db = store();
    expect(db.candidates.length).toBeGreaterThan(0);
    expect(db.missions).toHaveLength(0);
    expect(db.missionsCandidates).toHaveLength(0);
    expect(db.missionEvents).toHaveLength(0);
  });

  it("persists to disk", async () => {
    const { store, persistStore } = await import("../lib/store");
    store(); // initialize
    persistStore();
    expect(existsSync(TEST_DB_PATH)).toBe(true);
  });
});

describe("db module (in-memory path)", () => {
  it("getCandidatesByRole returns candidates for a given role", async () => {
    const { getCandidatesByRole } = await import("../lib/db");
    const hostesses = await getCandidatesByRole("hostess");
    expect(hostesses.length).toBeGreaterThan(0);
    hostesses.forEach((c) => {
      expect(c.role_type).toBe("hostess");
    });
  });

  it("getCandidatesByRole falls back to available candidates for unknown role", async () => {
    const { getCandidatesByRole } = await import("../lib/db");
    const candidates = await getCandidatesByRole("nonexistent_role");
    expect(candidates.length).toBeGreaterThan(0);
    candidates.forEach((c) => {
      expect(c.availability_status).toBe("available");
    });
  });

  it("getCandidateByPhone finds a candidate by phone", async () => {
    const { getCandidateByPhone } = await import("../lib/db");
    const candidate = await getCandidateByPhone("+33612000001");
    expect(candidate).not.toBeNull();
    expect(candidate!.name).toBe("Camille Moreau");
  });

  it("getCandidateByPhone returns null for unknown phone", async () => {
    const { getCandidateByPhone } = await import("../lib/db");
    const candidate = await getCandidateByPhone("+33999999999");
    expect(candidate).toBeNull();
  });

  it("listCandidates returns all candidates sorted by created_at desc", async () => {
    const { listCandidates } = await import("../lib/db");
    const all = await listCandidates();
    expect(all.length).toBeGreaterThan(0);
  });

  it("createMission creates and persists a mission", async () => {
    const { createMission, getMission } = await import("../lib/db");
    const mission = await createMission({
      role_type: "hostess",
      people_needed: 2,
      mission_date: "2025-12-01",
      start_time: "09:00",
      end_time: "18:00",
      city: "Paris",
      max_budget_per_person: 200,
      description: "Test mission",
      pricing_summary: null,
      mission_brief_fr: null,
      no_candidates_reason: null,
    });
    expect(mission.id).toBeTruthy();
    expect(mission.status).toBe("pending_outreach");

    const fetched = await getMission(mission.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.role_type).toBe("hostess");
  });

  it("updateMission updates a mission", async () => {
    const { createMission, updateMission, getMission } = await import("../lib/db");
    const mission = await createMission({
      role_type: "security",
      people_needed: 1,
      mission_date: "2025-12-01",
      start_time: null,
      end_time: null,
      city: "Lyon",
      max_budget_per_person: 300,
      description: "",
      pricing_summary: null,
      mission_brief_fr: null,
      no_candidates_reason: null,
    });

    await updateMission(mission.id, { status: "complete" });
    const updated = await getMission(mission.id);
    expect(updated!.status).toBe("complete");
  });

  it("getMission returns null for unknown id", async () => {
    const { getMission } = await import("../lib/db");
    const mission = await getMission("nonexistent-id");
    expect(mission).toBeNull();
  });

  it("listMissions returns all missions", async () => {
    const { createMission, listMissions } = await import("../lib/db");
    await createMission({
      role_type: "hostess",
      people_needed: 1,
      mission_date: "2025-12-01",
      start_time: null,
      end_time: null,
      city: "Paris",
      max_budget_per_person: 200,
      description: "",
      pricing_summary: null,
      mission_brief_fr: null,
      no_candidates_reason: null,
    });
    const missions = await listMissions();
    expect(missions.length).toBeGreaterThanOrEqual(1);
  });

  it("insertMissionCandidates and getShortlist round-trip", async () => {
    const {
      createMission,
      insertMissionCandidates,
      getShortlist,
      getCandidatesByRole,
    } = await import("../lib/db");

    const mission = await createMission({
      role_type: "hostess",
      people_needed: 1,
      mission_date: "2025-12-01",
      start_time: null,
      end_time: null,
      city: "Paris",
      max_budget_per_person: 200,
      description: "",
      pricing_summary: null,
      mission_brief_fr: null,
      no_candidates_reason: null,
    });
    const candidates = await getCandidatesByRole("hostess");
    const c = candidates[0];

    await insertMissionCandidates([
      {
        mission_id: mission.id,
        candidate_id: c.id,
        rank: 1,
        rationale: "Great fit",
        suggested_rate: 180,
        confidence_score: 0.9,
        fit: {
          role_match: 1,
          experience: 0.8,
          location: 1,
          language: 1,
          availability: 1,
        },
        call_status: "pending",
        call_notes: null,
        outreach_channel: null,
        whatsapp_status: "pending",
        twilio_sid: null,
      },
    ]);

    const shortlist = await getShortlist(mission.id);
    expect(shortlist).toHaveLength(1);
    expect(shortlist[0].candidate_id).toBe(c.id);
    expect(shortlist[0].candidate).toBeDefined();
    expect(shortlist[0].candidate.name).toBe(c.name);
  });

  it("addMissionEvent and getMissionEvents round-trip", async () => {
    const { createMission, addMissionEvent, getMissionEvents } = await import(
      "../lib/db"
    );

    const mission = await createMission({
      role_type: "hostess",
      people_needed: 1,
      mission_date: "2025-12-01",
      start_time: null,
      end_time: null,
      city: "Paris",
      max_budget_per_person: 200,
      description: "",
      pricing_summary: null,
      mission_brief_fr: null,
      no_candidates_reason: null,
    });

    await addMissionEvent(mission.id, "brief_parsed", "Test event");
    await addMissionEvent(mission.id, "ranked", "Ranked candidates");

    const events = await getMissionEvents(mission.id);
    expect(events).toHaveLength(2);
    expect(events[0].step).toBe("brief_parsed");
    expect(events[1].step).toBe("ranked");
  });

  it("insertCandidates inserts new and updates existing", async () => {
    const { insertCandidates, getCandidateByPhone } = await import(
      "../lib/db"
    );

    // Insert a new candidate
    const result1 = await insertCandidates([
      {
        name: "New Candidate",
        phone: "+33699999999",
        role_type: "hostess",
        years_experience: 2,
        day_rate: 130,
        city: "Nice",
        languages: ["Français"],
        availability_status: "available",
        notes: "New hire.",
      },
    ]);
    expect(result1.inserted).toBe(1);
    expect(result1.updated).toBe(0);

    const inserted = await getCandidateByPhone("+33699999999");
    expect(inserted).not.toBeNull();
    expect(inserted!.name).toBe("New Candidate");

    // Update the same candidate
    const result2 = await insertCandidates([
      {
        name: "Updated Candidate",
        phone: "+33699999999",
        role_type: "hostess",
        years_experience: 3,
        day_rate: 140,
        city: "Nice",
        languages: ["Français", "Anglais"],
        availability_status: "available",
        notes: "Updated notes.",
      },
    ]);
    expect(result2.inserted).toBe(0);
    expect(result2.updated).toBe(1);

    const updated = await getCandidateByPhone("+33699999999");
    expect(updated!.name).toBe("Updated Candidate");
    expect(updated!.years_experience).toBe(3);
  });

  it("updateMissionCandidate patches a mission candidate record", async () => {
    const {
      createMission,
      insertMissionCandidates,
      updateMissionCandidate,
      getShortlist,
      getCandidatesByRole,
    } = await import("../lib/db");

    const mission = await createMission({
      role_type: "hostess",
      people_needed: 1,
      mission_date: "2025-12-01",
      start_time: null,
      end_time: null,
      city: "Paris",
      max_budget_per_person: 200,
      description: "",
      pricing_summary: null,
      mission_brief_fr: null,
      no_candidates_reason: null,
    });
    const candidates = await getCandidatesByRole("hostess");
    const c = candidates[0];

    await insertMissionCandidates([
      {
        mission_id: mission.id,
        candidate_id: c.id,
        rank: 1,
        rationale: "Test",
        suggested_rate: 180,
        confidence_score: 0.9,
        fit: {
          role_match: 1,
          experience: 1,
          location: 1,
          language: 1,
          availability: 1,
        },
        call_status: "pending",
        call_notes: null,
        outreach_channel: null,
        whatsapp_status: "pending",
        twilio_sid: null,
      },
    ]);

    await updateMissionCandidate(mission.id, c.id, {
      whatsapp_status: "sent",
      outreach_channel: "whatsapp",
    });

    const shortlist = await getShortlist(mission.id);
    expect(shortlist[0].whatsapp_status).toBe("sent");
    expect(shortlist[0].outreach_channel).toBe("whatsapp");
  });

  it("updateWhatsappStatusByPhone updates the most recent entry", async () => {
    const {
      createMission,
      insertMissionCandidates,
      updateWhatsappStatusByPhone,
      getShortlist,
      getCandidatesByRole,
    } = await import("../lib/db");

    const mission = await createMission({
      role_type: "hostess",
      people_needed: 1,
      mission_date: "2025-12-01",
      start_time: null,
      end_time: null,
      city: "Paris",
      max_budget_per_person: 200,
      description: "",
      pricing_summary: null,
      mission_brief_fr: null,
      no_candidates_reason: null,
    });
    const candidates = await getCandidatesByRole("hostess");
    const c = candidates[0];

    await insertMissionCandidates([
      {
        mission_id: mission.id,
        candidate_id: c.id,
        rank: 1,
        rationale: "Test",
        suggested_rate: 180,
        confidence_score: 0.9,
        fit: {
          role_match: 1,
          experience: 1,
          location: 1,
          language: 1,
          availability: 1,
        },
        call_status: "no_answer",
        call_notes: null,
        outreach_channel: "whatsapp",
        whatsapp_status: "sent",
        twilio_sid: "mock_sid",
      },
    ]);

    const result = await updateWhatsappStatusByPhone(c.phone, "replied_yes");
    expect(result).not.toBeNull();
    expect(result!.whatsapp_status).toBe("replied_yes");
  });

  it("updateWhatsappStatusByPhone returns null for unknown phone", async () => {
    const { updateWhatsappStatusByPhone } = await import("../lib/db");
    const result = await updateWhatsappStatusByPhone(
      "+33999999999",
      "replied_yes",
    );
    expect(result).toBeNull();
  });
});
