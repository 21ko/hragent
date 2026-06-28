import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { existsSync, rmSync } from "fs";

const TEST_DB_DIR = join(process.cwd(), ".staffly-test-outreach");
const TEST_DB_PATH = join(TEST_DB_DIR, "test-db.json");

beforeEach(() => {
  process.env.STAFFLY_LOCAL_DB_PATH = TEST_DB_PATH;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_WHATSAPP_NUMBER;

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

describe("whatsappFallback", () => {
  it("sends WhatsApp and updates the mission candidate", async () => {
    const {
      createMission,
      insertMissionCandidates,
      getShortlist,
      getCandidatesByRole,
    } = await import("../lib/db");
    const { whatsappFallback } = await import("../lib/outreach");

    const mission = await createMission({
      role_type: "hostess",
      people_needed: 1,
      mission_date: "2025-12-01",
      start_time: "09:00",
      end_time: "18:00",
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
        rationale: "Good fit",
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
        outreach_channel: null,
        whatsapp_status: "pending",
        twilio_sid: null,
      },
    ]);

    await whatsappFallback(mission.id, c.id);

    const shortlist = await getShortlist(mission.id);
    expect(shortlist[0].whatsapp_status).toBe("sent");
    expect(shortlist[0].outreach_channel).toBe("whatsapp");
    expect(shortlist[0].twilio_sid).toBeTruthy();
  });

  it("is a no-op when mission does not exist", async () => {
    const { whatsappFallback } = await import("../lib/outreach");
    // Should not throw
    await whatsappFallback("nonexistent-mission", "nonexistent-candidate");
  });

  it("is a no-op when candidate is not in shortlist", async () => {
    const { createMission } = await import("../lib/db");
    const { whatsappFallback } = await import("../lib/outreach");

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

    await whatsappFallback(mission.id, "nonexistent-candidate");
    // No error, no-op
  });

  it("does not double-send if whatsapp already sent", async () => {
    const {
      createMission,
      insertMissionCandidates,
      getShortlist,
      getCandidatesByRole,
    } = await import("../lib/db");
    const { whatsappFallback } = await import("../lib/outreach");

    const mission = await createMission({
      role_type: "hostess",
      people_needed: 1,
      mission_date: "2025-12-01",
      start_time: "09:00",
      end_time: "18:00",
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
        rationale: "Good fit",
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
        twilio_sid: "original_sid",
      },
    ]);

    await whatsappFallback(mission.id, c.id);

    const shortlist = await getShortlist(mission.id);
    // Should keep original sid, not re-send
    expect(shortlist[0].twilio_sid).toBe("original_sid");
  });
});
