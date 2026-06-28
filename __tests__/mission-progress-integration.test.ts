import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { existsSync, rmSync } from "fs";

const TEST_DB_DIR = join(process.cwd(), ".staffly-test-progress");
const TEST_DB_PATH = join(TEST_DB_DIR, "test-db.json");

beforeEach(() => {
  process.env.STAFFLY_LOCAL_DB_PATH = TEST_DB_PATH;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;

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

describe("reconcileMissionProgress", () => {
  it("marks mission complete when all candidates are terminal", async () => {
    const {
      createMission,
      insertMissionCandidates,
      getMission,
      getCandidatesByRole,
    } = await import("../lib/db");
    const { reconcileMissionProgress } = await import(
      "../lib/mission-progress"
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
      status: "awaiting_replies",
    });

    const candidates = await getCandidatesByRole("hostess");

    await insertMissionCandidates([
      {
        mission_id: mission.id,
        candidate_id: candidates[0].id,
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
        call_status: "answered",
        call_notes: "OK",
        outreach_channel: "call",
        whatsapp_status: "pending",
        twilio_sid: null,
      },
    ]);

    const result = await reconcileMissionProgress(mission.id);
    expect(result).not.toBeNull();
    expect(result!.complete).toBe(true);
    expect(result!.resolved).toBe(1);
    expect(result!.total).toBe(1);

    const updated = await getMission(mission.id);
    expect(updated!.status).toBe("complete");
  });

  it("keeps mission as awaiting_replies when not all are terminal", async () => {
    const {
      createMission,
      insertMissionCandidates,
      getMission,
      getCandidatesByRole,
    } = await import("../lib/db");
    const { reconcileMissionProgress } = await import(
      "../lib/mission-progress"
    );

    const mission = await createMission({
      role_type: "hostess",
      people_needed: 2,
      mission_date: "2025-12-01",
      start_time: null,
      end_time: null,
      city: "Paris",
      max_budget_per_person: 200,
      description: "",
      pricing_summary: null,
      mission_brief_fr: null,
      no_candidates_reason: null,
      status: "pending_outreach",
    });

    const candidates = await getCandidatesByRole("hostess");

    await insertMissionCandidates([
      {
        mission_id: mission.id,
        candidate_id: candidates[0].id,
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
        call_status: "answered",
        call_notes: "OK",
        outreach_channel: "call",
        whatsapp_status: "pending",
        twilio_sid: null,
      },
      {
        mission_id: mission.id,
        candidate_id: candidates[1].id,
        rank: 2,
        rationale: "Test 2",
        suggested_rate: 170,
        confidence_score: 0.8,
        fit: {
          role_match: 1,
          experience: 0.8,
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

    const result = await reconcileMissionProgress(mission.id);
    expect(result!.complete).toBe(false);
    expect(result!.resolved).toBe(1);
    expect(result!.total).toBe(2);

    const updated = await getMission(mission.id);
    expect(updated!.status).toBe("awaiting_replies");
  });

  it("returns null for nonexistent mission", async () => {
    const { reconcileMissionProgress } = await import(
      "../lib/mission-progress"
    );
    const result = await reconcileMissionProgress("nonexistent");
    expect(result).toBeNull();
  });

  it("returns null for no_candidates mission", async () => {
    const { createMission } = await import("../lib/db");
    const { reconcileMissionProgress } = await import(
      "../lib/mission-progress"
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
      no_candidates_reason: "No one available",
      status: "no_candidates",
    });

    const result = await reconcileMissionProgress(mission.id);
    expect(result).toBeNull();
  });
});
