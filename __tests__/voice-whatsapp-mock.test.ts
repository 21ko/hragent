import { describe, it, expect } from "vitest";
import { callCandidate } from "../lib/voice";
import { sendWhatsApp } from "../lib/whatsapp";
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
    notes: "Test candidate",
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

describe("callCandidate (mock mode)", () => {
  it("returns 'answered' for rank 1", async () => {
    const result = await callCandidate(makeCandidate(), makeMission(), 1);
    expect(result.status).toBe("answered");
    expect(result.sid).toBeTruthy();
    expect(result.notes).toBeTruthy();
  });

  it("returns 'no_answer' for rank > 1", async () => {
    const result = await callCandidate(makeCandidate(), makeMission(), 2);
    expect(result.status).toBe("no_answer");
    expect(result.sid).toBeTruthy();
    expect(result.notes).toBeNull();
  });

  it("returns 'no_answer' for rank 5", async () => {
    const result = await callCandidate(makeCandidate(), makeMission(), 5);
    expect(result.status).toBe("no_answer");
  });
});

describe("sendWhatsApp (mock mode)", () => {
  it("returns ok=true with a mock sid", async () => {
    const result = await sendWhatsApp(makeCandidate(), makeMission(), 180);
    expect(result.ok).toBe(true);
    expect(result.sid).toMatch(/^mock_/);
  });

  it("generates different sids each call", async () => {
    const r1 = await sendWhatsApp(makeCandidate(), makeMission(), 180);
    const r2 = await sendWhatsApp(makeCandidate(), makeMission(), 180);
    expect(r1.sid).not.toBe(r2.sid);
  });
});
