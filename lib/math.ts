/**
 * Shared numeric utility functions used across pricing, agent scoring, and CV
 * parsing — extracted to avoid independent re-implementations.
 */

/** Clamp a number between arbitrary min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
}

/** Clamp a number to the [0, 1] range. Non-finite values map to 0. */
export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** Clamp to [0, 1] then round to two decimal places. */
export function round2(value: number): number {
  return Math.round(clamp01(value) * 100) / 100;
}
