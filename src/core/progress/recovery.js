/**
 * recovery.js — the recovery model (Identity doc §8, spec Phase E). Pure.
 * Shortening beats skipping; skipping beats quitting. Nothing is overdue.
 */
import { isMainLiftName } from "./exerciseProgress.js";
import { KG_PER_LB } from "./units.js";
import { daysBetween } from "./dates.js";

export const QUICK_MAX_EXERCISES = 3;

/** Main lifts first, then fill to at most 3 non-warm-up exercises; hide the rest (never delete). */
export function quickSessionExercises(exercises) {
  const working = (exercises || []).map((ex, i) => ({ ex, i })).filter(({ ex }) => !ex.section);
  const main = working.filter(({ ex }) => isMainLiftName(ex.exercise_name));
  const rest = working.filter(({ ex }) => !isMainLiftName(ex.exercise_name));
  const keep = new Set([...main, ...rest].slice(0, QUICK_MAX_EXERCISES).map(({ i }) => i));
  return (exercises || []).map((ex, i) => (ex.section ? ex : { ...ex, hidden_in_quick: !keep.has(i) }));
}

/** Undo a quick session: show everything again. */
export function fullSessionExercises(exercises) {
  return (exercises || []).map((ex) => {
    if (!ex.hidden_in_quick) return ex;
    const { hidden_in_quick, ...rest } = ex;
    return rest;
  });
}

/** Round a kg load to the nearest 5 lb (lbs users) or 2.5 kg (kg users), in kg. */
export function roundLoadKg(kg, unit = "lbs") {
  if (!kg || kg <= 0) return kg;
  if (unit === "kg") return Math.round(kg / 2.5) * 2.5;
  const lb = kg / KG_PER_LB;
  return (Math.round(lb / 5) * 5) * KG_PER_LB;
}

/** Scale uncompleted working-set loads by (1 - pct/100), rounded. Bodyweight untouched. */
export function scaledExercises(exercises, pct, unit = "lbs") {
  const f = 1 - pct / 100;
  return (exercises || []).map((ex) => {
    if (ex.section || ex.is_bodyweight) return ex;
    return {
      ...ex,
      sets_data: (ex.sets_data || []).map((s) => (s.completed || !(s.weight_kg > 0) ? s : { ...s, weight_kg: roundLoadKg(s.weight_kg * f, unit) })),
    };
  });
}

/** Count of main lifts in a workout (for "skipped priority session goes first"). */
export function mainLiftCount(workout) {
  return (workout?.exercises || []).filter((ex) => !ex.section && isMainLiftName(ex.exercise_name)).length;
}

/**
 * Standard-at-risk: remaining_needed = standard - counted; remaining_days =
 * days left in the week, including today if nothing counted today.
 * Show when still reachable but barely (slack <= 1).
 */
export function atRisk(ws) {
  if (!ws || ws.paused) return null;
  const remainingNeeded = ws.standard - ws.counted;
  const remainingDays = ws.daysLeftInclToday - (ws.countedToday ? 1 : 0);
  if (remainingNeeded <= 0) return null;
  if (remainingDays < remainingNeeded) return null; // week is lost; never report failure
  if (remainingDays - remainingNeeded > 1) return null;
  return { remainingNeeded, remainingDays };
}

/** Re-entry reduction in effect today (percent), or 0. */
export function reentryPctToday(reentry, today) {
  if (!reentry?.pct || reentry.reverted || !reentry.applied_at || !reentry.ends_on) return 0;
  if (today > reentry.ends_on) return 0;
  const start = reentry.applied_at.slice(0, 10);
  const day = daysBetween(start, today);
  if (day < 7) return reentry.pct;
  return reentry.second_pct || 0;
}

export function atRiskText({ remainingDays, remainingNeeded }) {
  const d = remainingDays === 1 ? "One day" : `${remainingDays === 2 ? "Two" : remainingDays} days`;
  return `${d} left, ${remainingNeeded} to hold your standard.`;
}
