import { describe, it, expect } from "vitest";
import { buildMessage } from "../lib/whatsapp";
import type { Candidate, Mission } from "../lib/types";

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: "c-1",
    name: "Marie Dupont",
    phone: "+33612345678",
    role_type: "hostess",
    years_experience: 3,
    day_rate: 150,
    city: "Paris",
    languages: ["Français"],
    availability_status: "available",
    notes: "",
    ...overrides,
  };
}

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
    description: "Salon professionnel",
    status: "awaiting_replies",
    pricing_summary: null,
    mission_brief_fr: null,
    no_candidates_reason: null,
    created_at: "2025-06-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildMessage", () => {
  it("includes the candidate name", () => {
    const msg = buildMessage(makeCandidate(), makeMission(), 180);
    expect(msg).toContain("Marie Dupont");
  });

  it("includes the role label (French)", () => {
    const msg = buildMessage(makeCandidate(), makeMission(), 180);
    expect(msg).toContain("Hôtesse");
  });

  it("includes the mission date and city", () => {
    const msg = buildMessage(makeCandidate(), makeMission(), 180);
    expect(msg).toContain("2025-07-15");
    expect(msg).toContain("Paris");
  });

  it("includes the rate", () => {
    const msg = buildMessage(makeCandidate(), makeMission(), 180);
    expect(msg).toContain("180€/jour");
  });

  it("ends with OUI ou NON prompt", () => {
    const msg = buildMessage(makeCandidate(), makeMission(), 180);
    expect(msg).toContain("OUI ou NON");
  });

  it("uses the correct role label for security", () => {
    const msg = buildMessage(
      makeCandidate(),
      makeMission({ role_type: "security" }),
      200,
    );
    expect(msg).toContain("Agent de sécurité");
  });
});
