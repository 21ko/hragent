import { describe, it, expect, vi, afterEach } from "vitest";
import { computeTrustedFit, fitConfidence, runAgent } from "../lib/agent";
import type { Candidate, FitBreakdown, JobBrief } from "../lib/types";

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: "c-test-1",
    name: "Test Candidate",
    phone: "+33600000001",
    role_type: "hostess",
    years_experience: 3,
    day_rate: 150,
    city: "Paris",
    languages: ["Français", "Anglais"],
    availability_status: "available",
    notes: "Hôtesse expérimentée, accueil VIP.",
    ...overrides,
  };
}

function makeBrief(overrides: Partial<JobBrief> = {}): JobBrief {
  return {
    role_type: "hostess",
    people_needed: 2,
    mission_date: "2099-12-01",
    start_time: "09:00",
    end_time: "18:00",
    city: "Paris",
    max_budget_per_person: 200,
    description: "Accueil salon professionnel, anglais requis",
    ...overrides,
  };
}

describe("computeTrustedFit", () => {
  it("gives role_match=1 when candidate and brief share the same role", () => {
    const candidate = makeCandidate({ role_type: "hostess" });
    const brief = makeBrief({ role_type: "hostess" });
    const fit = computeTrustedFit(candidate, brief);
    expect(fit.role_match).toBe(1);
  });

  it("gives partial role_match when roles differ but share tokens", () => {
    const candidate = makeCandidate({
      role_type: "event_staff",
      notes: "Staff événementiel polyvalent.",
    });
    const brief = makeBrief({ role_type: "event coordinator" });
    const fit = computeTrustedFit(candidate, brief);
    expect(fit.role_match).toBeGreaterThan(0.2);
    expect(fit.role_match).toBeLessThan(1);
  });

  it("gives role_match>0.2 when roles completely differ", () => {
    const candidate = makeCandidate({ role_type: "security", notes: "Agent de sécurité" });
    const brief = makeBrief({ role_type: "hostess" });
    const fit = computeTrustedFit(candidate, brief);
    expect(fit.role_match).toBeGreaterThanOrEqual(0.2);
    expect(fit.role_match).toBeLessThan(1);
  });

  it("gives location=1 when cities match (case-insensitive)", () => {
    const candidate = makeCandidate({ city: "paris" });
    const brief = makeBrief({ city: "Paris" });
    const fit = computeTrustedFit(candidate, brief);
    expect(fit.location).toBe(1);
  });

  it("gives location=0.35 when cities differ", () => {
    const candidate = makeCandidate({ city: "Lyon" });
    const brief = makeBrief({ city: "Paris" });
    const fit = computeTrustedFit(candidate, brief);
    expect(fit.location).toBe(0.35);
  });

  it("gives availability=1 for available candidates", () => {
    const candidate = makeCandidate({ availability_status: "available" });
    const brief = makeBrief();
    const fit = computeTrustedFit(candidate, brief);
    expect(fit.availability).toBe(1);
  });

  it("gives availability=0.5 for review candidates", () => {
    const candidate = makeCandidate({ availability_status: "review" });
    const brief = makeBrief();
    const fit = computeTrustedFit(candidate, brief);
    expect(fit.availability).toBe(0.5);
  });

  it("gives availability=0 for busy candidates", () => {
    const candidate = makeCandidate({ availability_status: "busy" });
    const brief = makeBrief();
    const fit = computeTrustedFit(candidate, brief);
    expect(fit.availability).toBe(0);
  });

  it("computes language=1 when all required languages match", () => {
    const candidate = makeCandidate({ languages: ["Français", "Anglais"] });
    const brief = makeBrief({ description: "Mission nécessitant francais et anglais" });
    const fit = computeTrustedFit(candidate, brief);
    expect(fit.language).toBe(1);
  });

  it("computes language=0.5 when half of required languages match", () => {
    const candidate = makeCandidate({ languages: ["Français"] });
    const brief = makeBrief({ description: "Francais et anglais requis" });
    const fit = computeTrustedFit(candidate, brief);
    expect(fit.language).toBe(0.5);
  });

  it("gives language=1 when no specific language is required", () => {
    const candidate = makeCandidate({ languages: ["Français"] });
    const brief = makeBrief({ description: "Mission générale" });
    const fit = computeTrustedFit(candidate, brief);
    expect(fit.language).toBe(1);
  });

  it("scales experience relative to required years", () => {
    const candidate = makeCandidate({ years_experience: 2 });
    const brief = makeBrief({ description: "Recherche profil avec 4 ans expérience" });
    const fit = computeTrustedFit(candidate, brief);
    expect(fit.experience).toBe(0.5);
  });

  it("caps experience at 1 when candidate exceeds requirements", () => {
    const candidate = makeCandidate({ years_experience: 10 });
    const brief = makeBrief({ description: "Recherche profil 2 ans" });
    const fit = computeTrustedFit(candidate, brief);
    expect(fit.experience).toBe(1);
  });

  it("infers senior requirement from description keywords", () => {
    const candidate = makeCandidate({ years_experience: 3 });
    const brief = makeBrief({ description: "Recherche profil senior" });
    const fit = computeTrustedFit(candidate, brief);
    // senior infers 5 years required, 3/5=0.6
    expect(fit.experience).toBe(0.6);
  });

  it("all fit values are between 0 and 1", () => {
    const candidate = makeCandidate();
    const brief = makeBrief();
    const fit = computeTrustedFit(candidate, brief);
    for (const key of Object.keys(fit) as Array<keyof FitBreakdown>) {
      expect(fit[key]).toBeGreaterThanOrEqual(0);
      expect(fit[key]).toBeLessThanOrEqual(1);
    }
  });
});

describe("fitConfidence", () => {
  it("returns a weighted sum between 0 and 1", () => {
    const fit: FitBreakdown = {
      role_match: 1,
      experience: 1,
      location: 1,
      language: 1,
      availability: 1,
    };
    const score = fitConfidence(fit, "hostess");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("returns 1 when all fit dimensions are perfect", () => {
    const fit: FitBreakdown = {
      role_match: 1,
      experience: 1,
      location: 1,
      language: 1,
      availability: 1,
    };
    expect(fitConfidence(fit, "hostess")).toBe(1);
    expect(fitConfidence(fit, "security")).toBe(1);
    expect(fitConfidence(fit, "event_staff")).toBe(1);
  });

  it("returns 0 when all fit dimensions are zero", () => {
    const fit: FitBreakdown = {
      role_match: 0,
      experience: 0,
      location: 0,
      language: 0,
      availability: 0,
    };
    expect(fitConfidence(fit, "hostess")).toBe(0);
  });

  it("uses role-specific weights for security", () => {
    const fit: FitBreakdown = {
      role_match: 1,
      experience: 0,
      location: 0,
      language: 0,
      availability: 0,
    };
    // security weights role_match at 0.35
    expect(fitConfidence(fit, "security")).toBe(0.35);
  });

  it("uses role-specific weights for hostess", () => {
    const fit: FitBreakdown = {
      role_match: 0,
      experience: 0,
      location: 0,
      language: 1,
      availability: 0,
    };
    // hostess weights language at 0.25
    expect(fitConfidence(fit, "hostess")).toBe(0.25);
  });

  it("uses default weights for unknown roles", () => {
    const fit: FitBreakdown = {
      role_match: 1,
      experience: 0,
      location: 0,
      language: 0,
      availability: 0,
    };
    // default weights role_match at 0.3
    expect(fitConfidence(fit, "unknown_role")).toBe(0.3);
  });
});

describe("runAgent (mock mode, no ANTHROPIC_API_KEY)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a shortlist of up to 5 candidates", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-11-28T08:00:00Z"));

    const candidates = Array.from({ length: 8 }, (_, i) =>
      makeCandidate({
        id: `c-test-${i}`,
        name: `Candidate ${i}`,
        phone: `+3360000000${i}`,
        day_rate: 120,
        years_experience: i + 1,
      }),
    );

    const result = await runAgent(makeBrief(), candidates);
    expect(result.shortlist.length).toBeLessThanOrEqual(5);
    expect(result.shortlist.length).toBeGreaterThan(0);
  });

  it("returns empty shortlist with reason when no candidates eligible", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-11-28T08:00:00Z"));

    const candidates = [
      makeCandidate({ availability_status: "busy", id: "c-busy-1" }),
      makeCandidate({ availability_status: "busy", id: "c-busy-2" }),
    ];

    const result = await runAgent(
      makeBrief({ max_budget_per_person: 200 }),
      candidates,
    );
    expect(result.shortlist).toHaveLength(0);
    expect(result.no_candidates_reason).toBeTruthy();
  });

  it("excludes candidates that blow past the budget", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-11-28T08:00:00Z"));

    const candidates = [
      makeCandidate({ id: "c-expensive", day_rate: 500, years_experience: 10 }),
    ];

    const result = await runAgent(
      makeBrief({ max_budget_per_person: 100 }),
      candidates,
    );
    expect(result.shortlist).toHaveLength(0);
  });

  it("ranks candidates with higher fit scores first", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-11-28T08:00:00Z"));

    const candidates = [
      makeCandidate({
        id: "c-low",
        city: "Lyon",
        years_experience: 0,
        day_rate: 100,
      }),
      makeCandidate({
        id: "c-high",
        city: "Paris",
        years_experience: 5,
        day_rate: 150,
      }),
    ];

    const result = await runAgent(makeBrief({ city: "Paris" }), candidates);
    expect(result.shortlist[0].candidate_id).toBe("c-high");
  });

  it("includes pricing_summary and mission_brief_fr", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-11-28T08:00:00Z"));

    const result = await runAgent(makeBrief(), [makeCandidate()]);
    expect(result.pricing_summary).toBeTruthy();
    expect(result.mission_brief_fr).toBeTruthy();
  });

  it("assigns sequential ranks starting from 1", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-11-28T08:00:00Z"));

    const candidates = Array.from({ length: 3 }, (_, i) =>
      makeCandidate({
        id: `c-test-${i}`,
        name: `Candidate ${i}`,
        phone: `+3360000000${i}`,
        day_rate: 120 + i * 10,
      }),
    );

    const result = await runAgent(makeBrief(), candidates);
    result.shortlist.forEach((s, i) => {
      expect(s.rank).toBe(i + 1);
    });
  });
});
