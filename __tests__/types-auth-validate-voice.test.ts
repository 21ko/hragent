import { describe, it, expect } from "vitest";
import { roleLabel, ROLE_LABELS_FR } from "../lib/types";
import { checkApiKey } from "../lib/auth";
import { validateBrief } from "../lib/run-mission";
import { hrQuestions } from "../lib/voice";
import type { Mission } from "../lib/types";

// ---------- roleLabel ----------

describe("roleLabel", () => {
  it("returns French label for known roles", () => {
    expect(roleLabel("hostess")).toBe("Hôtesse");
    expect(roleLabel("security")).toBe("Agent de sécurité");
    expect(roleLabel("event_staff")).toBe("Staff événementiel");
  });

  it("trims and returns the input for unknown roles", () => {
    expect(roleLabel("  custom role  ")).toBe("custom role");
  });

  it("returns trimmed input for empty string", () => {
    expect(roleLabel("")).toBe("");
  });
});

// ---------- checkApiKey ----------

describe("checkApiKey", () => {
  it("returns true when STAFFLY_API_KEY is not set (demo mode)", () => {
    // Module-level const reads process.env at import time.
    // Since tests run without STAFFLY_API_KEY, checkApiKey always returns true.
    const req = new Request("http://localhost/api/v1/missions");
    expect(checkApiKey(req)).toBe(true);
  });
});

// ---------- validateBrief ----------

describe("validateBrief", () => {
  it("returns null for a valid brief", () => {
    expect(
      validateBrief({
        role_type: "hostess",
        mission_date: "2025-12-01",
        city: "Paris",
        people_needed: 2,
        max_budget_per_person: 200,
        start_time: "09:00",
        end_time: "18:00",
        description: "Test",
      }),
    ).toBeNull();
  });

  it("rejects missing role_type", () => {
    const err = validateBrief({ mission_date: "2025-12-01", city: "Paris" });
    expect(err).toContain("role_type");
  });

  it("rejects empty role_type", () => {
    const err = validateBrief({ role_type: "  ", mission_date: "2025-12-01", city: "Paris" });
    expect(err).toContain("role_type");
  });

  it("rejects role_type longer than 100 characters", () => {
    const err = validateBrief({
      role_type: "x".repeat(101),
      mission_date: "2025-12-01",
      city: "Paris",
    });
    expect(err).toContain("role_type");
    expect(err).toContain("100");
  });

  it("rejects missing mission_date", () => {
    const err = validateBrief({ role_type: "hostess", city: "Paris" });
    expect(err).toContain("mission_date");
  });

  it("rejects missing city", () => {
    const err = validateBrief({ role_type: "hostess", mission_date: "2025-12-01" });
    expect(err).toContain("city");
  });
});

// ---------- hrQuestions ----------

function makeMission(overrides: Partial<Mission> = {}): Mission {
  return {
    id: "m-1",
    role_type: "hostess",
    people_needed: 2,
    mission_date: "2025-07-15",
    start_time: "09:00",
    end_time: "18:00",
    city: "Paris",
    max_budget_per_person: 200,
    description: "Salon",
    status: "awaiting_replies",
    pricing_summary: null,
    mission_brief_fr: null,
    no_candidates_reason: null,
    created_at: "2025-06-01T00:00:00Z",
    ...overrides,
  };
}

describe("hrQuestions", () => {
  it("returns base questions for all roles", () => {
    const questions = hrQuestions(makeMission());
    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions[0]).toContain("disponibilité");
    expect(questions[0]).toContain("2025-07-15");
    expect(questions[0]).toContain("Paris");
  });

  it("adds security-specific question for security role", () => {
    const questions = hrQuestions(makeMission({ role_type: "security" }));
    expect(questions.length).toBe(4);
    expect(questions[3]).toContain("carte professionnelle");
  });

  it("adds hostess-specific question for hostess role", () => {
    const questions = hrQuestions(makeMission({ role_type: "hostess" }));
    expect(questions.length).toBe(4);
    expect(questions[3]).toContain("anglais");
  });

  it("adds event_staff-specific question for event_staff role", () => {
    const questions = hrQuestions(makeMission({ role_type: "event_staff" }));
    expect(questions.length).toBe(4);
    expect(questions[3]).toContain("manutention");
  });

  it("returns only base questions for unknown roles", () => {
    const questions = hrQuestions(makeMission({ role_type: "chef" }));
    expect(questions.length).toBe(3);
  });

  it("uses start_time if available", () => {
    const questions = hrQuestions(makeMission({ start_time: "14:00" }));
    expect(questions[2]).toContain("14:00");
  });

  it("handles null start_time gracefully", () => {
    const questions = hrQuestions(makeMission({ start_time: null }));
    expect(questions[2]).toContain("l'heure prévue");
  });
});
