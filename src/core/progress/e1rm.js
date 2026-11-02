/**
 * e1rm.js — estimated one-rep max. Internal comparison engine only; never
 * shown as a headline number (docs/SFRMR_RULES.md).
 */

/** Epley estimate for 1-12 reps; null outside that range. */
export function epley(weightKg, reps) {
  if (!weightKg || weightKg <= 0 || !reps || reps < 1 || reps > 12) return null;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export const REP_BUCKETS = ["1-3", "4-6", "7-10", "11-15", "16+"];

/** Rep bucket for a rep count. */
export function repBucket(reps) {
  if (!reps || reps < 1) return null;
  if (reps <= 3) return "1-3";
  if (reps <= 6) return "4-6";
  if (reps <= 10) return "7-10";
  if (reps <= 15) return "11-15";
  return "16+";
}
