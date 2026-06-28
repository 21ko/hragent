import type { Candidate } from "./types";

/**
 * Fair-price formula used by the agent and shown in the "pricing explained"
 * section of the results page:
 *
 *   suggested_rate = base_rate × exp_multiplier × urgency_multiplier
 *
 *   exp_multiplier:     1.0  (<1yr)   1.15 (1-3yr)   1.3 (3+yr)
 *   urgency_multiplier: 1.3  (<24h)   1.15 (24-72h)  1.0 (>72h)
 */

export function expMultiplier(yearsExperience: number): number {
  if (yearsExperience < 1) return 1.0;
  if (yearsExperience < 3) return 1.15;
  return 1.3;
}

export function expBand(yearsExperience: number): string {
  if (yearsExperience < 1) return "<1 an";
  if (yearsExperience < 3) return "1-3 ans";
  return "3 ans et +";
}

/** Hours between now and the mission start, used to derive urgency. */
export function hoursUntilMission(missionDate: string, startTime?: string): number {
  const time = startTime && /^\d{2}:\d{2}/.test(startTime) ? startTime : "09:00";
  const start = new Date(`${missionDate}T${time}:00`);
  const diffMs = start.getTime() - Date.now();
  return diffMs / (1000 * 60 * 60);
}

export function urgencyMultiplier(hours: number): number {
  if (hours < 24) return 1.3;
  if (hours < 72) return 1.15;
  return 1.0;
}

export function urgencyBand(hours: number): string {
  if (hours < 24) return "<24h";
  if (hours < 72) return "24-72h";
  return ">72h";
}

export function computeRate(
  candidate: Pick<Candidate, "day_rate" | "years_experience">,
  hours: number,
): number {
  const raw =
    candidate.day_rate *
    expMultiplier(candidate.years_experience) *
    urgencyMultiplier(hours);
  return Math.round(raw);
}

export function baseRateForRole(role: string): number {
  const normalized = role.trim().toLowerCase();
  if (normalized === "hostess" || /h[oô]te|accueil/.test(normalized)) return 120;
  if (normalized === "security" || /s[ée]curit[ée]|guard/.test(normalized)) return 160;
  if (normalized === "event_staff" || /[ée]v[ée]nement|event/.test(normalized)) return 130;
  return 150;
}
