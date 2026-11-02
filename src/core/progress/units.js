/**
 * units.js — weight/rep normalization. Everything is stored and compared in
 * kg; lb conversions round-trip with drift (225 lb = 102.06 kg), so weight
 * equality uses a ±0.5 kg tolerance.
 */

export const KG_PER_LB = 0.45359237;
export const LB_PER_KG = 2.20462;
export const WEIGHT_TOLERANCE_KG = 0.5;

/** True when two kg weights are the same load within tolerance. */
export function sameWeightKg(a, b) {
  if (a == null || b == null) return false;
  return Math.abs(Number(a) - Number(b)) <= WEIGHT_TOLERANCE_KG;
}

/** Parse a logged reps value ("8", "8 reps", 8) → positive int, else null. */
export function parseReps(value) {
  if (value == null) return null;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** kg → display value in the user's unit, rounded to 0.5. */
export function toDisplayWeight(kg, unit = "lbs") {
  if (kg == null || !Number.isFinite(Number(kg))) return 0;
  const v = unit === "kg" ? Number(kg) : Number(kg) * LB_PER_KG;
  return Math.round(v * 2) / 2;
}

/** Unit label for display. */
export function unitLabel(unit = "lbs") {
  return unit === "kg" ? "kg" : "lb";
}

/** Format a kg weight in the user's unit, e.g. "225". Drops a trailing .0. */
export function formatWeight(kg, unit = "lbs") {
  const v = toDisplayWeight(kg, unit);
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}
