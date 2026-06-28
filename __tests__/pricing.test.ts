import { describe, it, expect, vi, afterEach } from "vitest";
import {
  expMultiplier,
  expBand,
  hoursUntilMission,
  urgencyMultiplier,
  urgencyBand,
  computeRate,
  baseRateForRole,
} from "../lib/pricing";

describe("expMultiplier", () => {
  it("returns 1.0 for less than 1 year", () => {
    expect(expMultiplier(0)).toBe(1.0);
    expect(expMultiplier(0.5)).toBe(1.0);
    expect(expMultiplier(0.99)).toBe(1.0);
  });

  it("returns 1.15 for 1-3 years", () => {
    expect(expMultiplier(1)).toBe(1.15);
    expect(expMultiplier(2)).toBe(1.15);
    expect(expMultiplier(2.99)).toBe(1.15);
  });

  it("returns 1.3 for 3+ years", () => {
    expect(expMultiplier(3)).toBe(1.3);
    expect(expMultiplier(10)).toBe(1.3);
    expect(expMultiplier(20)).toBe(1.3);
  });
});

describe("expBand", () => {
  it("returns '<1 an' for less than 1 year", () => {
    expect(expBand(0)).toBe("<1 an");
    expect(expBand(0.5)).toBe("<1 an");
  });

  it("returns '1-3 ans' for 1-3 years", () => {
    expect(expBand(1)).toBe("1-3 ans");
    expect(expBand(2.5)).toBe("1-3 ans");
  });

  it("returns '3 ans et +' for 3+ years", () => {
    expect(expBand(3)).toBe("3 ans et +");
    expect(expBand(15)).toBe("3 ans et +");
  });
});

describe("hoursUntilMission", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes hours between now and mission start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T08:00:00Z"));

    const hours = hoursUntilMission("2025-06-02", "10:00");
    expect(hours).toBe(26);
  });

  it("defaults to 09:00 when start_time is not provided", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T08:00:00Z"));

    const hours = hoursUntilMission("2025-06-02");
    expect(hours).toBe(25);
  });

  it("defaults to 09:00 when start_time is invalid", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T08:00:00Z"));

    const hoursInvalid = hoursUntilMission("2025-06-02", "invalid");
    const hoursDefault = hoursUntilMission("2025-06-02");
    expect(hoursInvalid).toBe(hoursDefault);
  });

  it("returns negative hours for past missions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-03T12:00:00Z"));

    const hours = hoursUntilMission("2025-06-01", "09:00");
    expect(hours).toBeLessThan(0);
  });
});

describe("urgencyMultiplier", () => {
  it("returns 1.3 for less than 24 hours", () => {
    expect(urgencyMultiplier(0)).toBe(1.3);
    expect(urgencyMultiplier(12)).toBe(1.3);
    expect(urgencyMultiplier(23.9)).toBe(1.3);
  });

  it("returns 1.15 for 24-72 hours", () => {
    expect(urgencyMultiplier(24)).toBe(1.15);
    expect(urgencyMultiplier(48)).toBe(1.15);
    expect(urgencyMultiplier(71)).toBe(1.15);
  });

  it("returns 1.0 for more than 72 hours", () => {
    expect(urgencyMultiplier(72)).toBe(1.0);
    expect(urgencyMultiplier(200)).toBe(1.0);
  });
});

describe("urgencyBand", () => {
  it("returns '<24h' for less than 24 hours", () => {
    expect(urgencyBand(10)).toBe("<24h");
  });

  it("returns '24-72h' for 24-72 hours", () => {
    expect(urgencyBand(48)).toBe("24-72h");
  });

  it("returns '>72h' for more than 72 hours", () => {
    expect(urgencyBand(100)).toBe(">72h");
  });
});

describe("computeRate", () => {
  it("applies experience and urgency multipliers", () => {
    // base=150, exp=1.3 (5yr), urgency=1.3 (<24h)
    const rate = computeRate({ day_rate: 150, years_experience: 5 }, 10);
    expect(rate).toBe(Math.round(150 * 1.3 * 1.3));
  });

  it("rounds to nearest integer", () => {
    // base=130, exp=1.15 (2yr), urgency=1.0 (>72h) = 149.5
    const rate = computeRate({ day_rate: 130, years_experience: 2 }, 100);
    expect(rate).toBe(Math.round(130 * 1.15 * 1.0));
  });

  it("handles beginner with low urgency", () => {
    // base=100, exp=1.0 (<1yr), urgency=1.0 (>72h)
    const rate = computeRate({ day_rate: 100, years_experience: 0 }, 200);
    expect(rate).toBe(100);
  });

  it("handles experienced candidate with high urgency", () => {
    // base=200, exp=1.3 (10yr), urgency=1.3 (<24h)
    const rate = computeRate({ day_rate: 200, years_experience: 10 }, 5);
    expect(rate).toBe(Math.round(200 * 1.3 * 1.3));
  });
});

describe("baseRateForRole", () => {
  it("returns 120 for hostess roles", () => {
    expect(baseRateForRole("hostess")).toBe(120);
    expect(baseRateForRole("Hostess")).toBe(120);
    expect(baseRateForRole("hôtesse d'accueil")).toBe(120);
    expect(baseRateForRole("accueil")).toBe(120);
  });

  it("returns 160 for security roles", () => {
    expect(baseRateForRole("security")).toBe(160);
    expect(baseRateForRole("Security")).toBe(160);
    expect(baseRateForRole("sécurité")).toBe(160);
    expect(baseRateForRole("agent de sécurité")).toBe(160);
  });

  it("returns 130 for event staff roles", () => {
    expect(baseRateForRole("event_staff")).toBe(130);
    expect(baseRateForRole("événementiel")).toBe(130);
    expect(baseRateForRole("event coordinator")).toBe(130);
  });

  it("returns 150 for unknown roles", () => {
    expect(baseRateForRole("chef")).toBe(150);
    expect(baseRateForRole("other")).toBe(150);
    expect(baseRateForRole("")).toBe(150);
  });
});
