/**
 * exerciseProgress.js — per exercise+variation baselines, bests, trends, the
 * improvement rule, and PR detection (docs/SFRMR_RULES.md → Improvement, PRs).
 * Pure functions; engine.js persists the results.
 */
import { epley, repBucket, REP_BUCKETS } from "./e1rm.js";
import { parseReps, sameWeightKg } from "./units.js";
import { daysBetween } from "./dates.js";
import { isWorkingExercise, isWorkingSet, workoutLocalDate } from "./counting.js";

export const CALIBRATION_EXPOSURES = 3;

/** Stable key: lowercase name + "|" + lowercase variation. */
export function exerciseKey(name, variation) {
  return `${String(name || "").trim().toLowerCase()}|${String(variation || "").trim().toLowerCase()}`;
}

// Main lifts (Identity doc §6). Matched on exercise name.
const MAIN_LIFT_PATTERNS = [
  /\b(back|front|high[- ]bar|low[- ]bar)?\s*squat\b/i,
  /^(barbell )?bench press$/i,
  /\bbarbell bench press\b/i,
  /\bincline barbell bench press\b/i,
  /\b(conventional |sumo )?deadlift\b/i,
  /\bromanian deadlift\b|\brdl\b/i,
  /\boverhead press\b|\bmilitary press\b/i,
  /\bbarbell row\b/i,
  /\bpull[- ]?ups?\b/i,
  /\bchin[- ]?ups?\b/i,
  /\bhip thrusts?\b/i,
  /\bleg press\b/i,
];
const NOT_MAIN = /\b(dumbbell|db|kettlebell|goblet|split|bulgarian|hack|smith|assisted|jump|single[- ]leg|cable|machine|band)\b/i;

export function isMainLiftName(name) {
  const n = String(name || "");
  // Leg press is a machine but is on the main list.
  if (/\bleg press\b/i.test(n)) return !/\bsingle[- ]leg\b/i.test(n);
  if (NOT_MAIN.test(n)) return false;
  return MAIN_LIFT_PATTERNS.some((re) => re.test(n));
}

export function isAssistedName(name) {
  return /assisted/i.test(String(name || ""));
}

/** Library flags win over name matching when present. */
export function liftFlags(exercise, libraryDef) {
  return {
    is_main_lift: libraryDef?.is_main_lift ?? isMainLiftName(exercise?.exercise_name),
    is_assisted: libraryDef?.is_assisted ?? isAssistedName(exercise?.exercise_name),
    is_bodyweight: !!exercise?.is_bodyweight,
  };
}

/** Completed working sets of an exercise as [{weight_kg, reps}]. */
export function sessionSets(exercise) {
  if (!isWorkingExercise(exercise)) return [];
  return (exercise.sets_data || [])
    .filter((s) => s && s.completed && isWorkingSet(s))
    .map((s) => ({ weight_kg: Number(s.weight_kg) || 0, reps: parseReps(s.reps) }))
    .filter((s) => s.reps);
}

/** The best set of a session: highest e1RM (assisted: lightest load; bodyweight: most reps). */
export function topSet(sets, flags = {}) {
  let best = null;
  for (const s of sets || []) {
    if (!best) { best = s; continue; }
    if (flags.is_bodyweight) { if (s.reps > best.reps) best = s; continue; }
    if (flags.is_assisted) {
      if (s.weight_kg < best.weight_kg - 0.5 || (sameWeightKg(s.weight_kg, best.weight_kg) && s.reps > best.reps)) best = s;
      continue;
    }
    const e = epley(s.weight_kg, s.reps) ?? s.weight_kg;
    const be = epley(best.weight_kg, best.reps) ?? best.weight_kg;
    if (e > be || (e === be && s.reps > best.reps)) best = s;
  }
  return best;
}

function emptyStat(key, exercise, flags) {
  return {
    exercise_key: key,
    exercise_name: exercise.exercise_name,
    variation: exercise.variation || "",
    ...flags,
    exposures: 0,
    calibration_status: "calibrating",
    established_at: null,
    last_session: null,
    best_weight_kg: null, best_weight_reps: null, best_weight_date: null,
    best_e1rm_kg: null, best_e1rm_date: null,
    best_reps_at_weight: [],
    best_by_bucket: [],
    since_return_best_e1rm_kg: null,
    session_history: [],
    trend: "not_enough_data",
  };
}

/** Apply one completed session of an exercise to a stat (returns a new stat). */
export function applySession(stat, { workoutId, date, sets, returnedAt = null }) {
  if (!sets.length) return stat;
  const s = { ...stat, best_reps_at_weight: [...(stat.best_reps_at_weight || [])], best_by_bucket: [...(stat.best_by_bucket || [])], session_history: [...(stat.session_history || [])] };
  s.exposures = (s.exposures || 0) + 1;
  if (s.exposures >= CALIBRATION_EXPOSURES && s.calibration_status !== "established") {
    s.calibration_status = "established";
    s.established_at = date;
  }
  s.last_session = { workout_id: workoutId, date, sets: sets.map((x) => ({ weight_kg: x.weight_kg, reps: x.reps })) };

  for (const set of sets) {
    const w = set.weight_kg, r = set.reps;
    // Heaviest (assisted: lightest assistance) weight for >= 1 rep.
    if (!s.is_bodyweight && w > 0) {
      const better = s.best_weight_kg == null
        || (s.is_assisted ? w < s.best_weight_kg - 0.5 : w > s.best_weight_kg + 0.5)
        || (sameWeightKg(w, s.best_weight_kg) && r > (s.best_weight_reps || 0));
      if (better) { s.best_weight_kg = w; s.best_weight_reps = r; s.best_weight_date = date; }
    }
    // Most reps at a weight.
    const idx = s.best_reps_at_weight.findIndex((b) => sameWeightKg(b.weight_kg, w));
    if (idx === -1) s.best_reps_at_weight.push({ weight_kg: w, reps: r, date });
    else if (r > s.best_reps_at_weight[idx].reps) s.best_reps_at_weight[idx] = { weight_kg: s.best_reps_at_weight[idx].weight_kg, reps: r, date };
    // e1RM (overall and per bucket, reps <= 15 for buckets).
    const e = s.is_assisted || s.is_bodyweight ? null : epley(w, r);
    if (e != null) {
      if (s.best_e1rm_kg == null || e > s.best_e1rm_kg) { s.best_e1rm_kg = e; s.best_e1rm_date = date; }
      if (returnedAt && date >= returnedAt && (s.since_return_best_e1rm_kg == null || e > s.since_return_best_e1rm_kg)) s.since_return_best_e1rm_kg = e;
    }
    const bucket = repBucket(r);
    if (bucket && r <= 15 && e != null) {
      const bi = s.best_by_bucket.findIndex((b) => b.bucket === bucket);
      if (bi === -1 || e > s.best_by_bucket[bi].e1rm_kg) {
        const row = { bucket, e1rm_kg: e, weight_kg: w, reps: r, date };
        if (bi === -1) s.best_by_bucket.push(row); else s.best_by_bucket[bi] = row;
      }
    }
  }
  if (s.best_reps_at_weight.length > 40) {
    s.best_reps_at_weight = s.best_reps_at_weight.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);
  }
  s.best_by_bucket.sort((a, b) => REP_BUCKETS.indexOf(a.bucket) - REP_BUCKETS.indexOf(b.bucket));

  const top = topSet(sets, s);
  s.session_history.push({
    date,
    top_weight_kg: top.weight_kg,
    top_reps: top.reps,
    e1rm_kg: s.is_assisted || s.is_bodyweight ? null : epley(top.weight_kg, top.reps),
  });
  if (s.session_history.length > 16) s.session_history = s.session_history.slice(-16);
  return s;
}

/**
 * Rebuild stats for every exercise from completed workouts, chronologically.
 * @param workouts completed workouts
 * @param opts { onlyKeys?: Set, library?: Map(name → Exercise), returnedAt? }
 * @returns Map(exercise_key → stat)
 */
export function buildExerciseStats(workouts, { onlyKeys = null, library = null, returnedAt = null } = {}) {
  const ordered = (workouts || [])
    .filter((w) => w.completed && !w.skipped)
    .map((w) => ({ w, date: workoutLocalDate(w) }))
    .filter((x) => x.date)
    .sort((a, b) => a.date === b.date
      ? String(a.w.completed_date || "").localeCompare(String(b.w.completed_date || ""))
      : a.date.localeCompare(b.date));
  const stats = new Map();
  for (const { w, date } of ordered) {
    for (const ex of w.exercises || []) {
      if (!isWorkingExercise(ex) || !ex.exercise_name) continue;
      const key = exerciseKey(ex.exercise_name, ex.variation);
      if (onlyKeys && !onlyKeys.has(key)) continue;
      const sets = sessionSets(ex);
      if (!sets.length) continue;
      const flags = liftFlags(ex, library?.get?.(ex.exercise_name));
      const prev = stats.get(key) || emptyStat(key, ex, flags);
      stats.set(key, applySession(prev, { workoutId: w.id, date, sets, returnedAt }));
    }
  }
  return stats;
}

/**
 * Trend label (Identity doc §6). context: { isDeload, volumePhase, returning, today }.
 */
export function computeTrend(stat, { isDeload = false, volumePhase = null, returning = false, today }) {
  const hist = (stat?.session_history || []).filter((h) => daysBetween(h.date, today) <= 42);
  if (stat?.calibration_status !== "established" || hist.length < 4) return "not_enough_data";
  const highRep = hist.every((h) => (h.top_reps || 0) > 12) || stat.is_bodyweight || stat.is_assisted;
  const recent = hist.filter((h) => daysBetween(h.date, today) <= 14);
  const older = hist.filter((h) => { const d = daysBetween(h.date, today); return d >= 28 && d <= 42; });
  if (!recent.length || !older.length) return "stable";
  let change;
  if (highRep) {
    // Reps at matched weight.
    const bestRecent = Math.max(...recent.map((h) => h.top_reps || 0));
    const bestOlder = Math.max(...older.map((h) => h.top_reps || 0));
    change = bestRecent - bestOlder;
    if (change >= 1) return "progressing";
    if (change <= -2 && recent.length >= 3 && !isDeload && !returning) return "declining";
  } else {
    const bestRecent = Math.max(...recent.map((h) => h.e1rm_kg || 0));
    const bestOlder = Math.max(...older.map((h) => h.e1rm_kg || 0));
    if (!bestOlder) return "stable";
    change = (bestRecent - bestOlder) / bestOlder;
    if (change > 0.02) return "progressing";
    const last3 = hist.slice(-3);
    if (change < -0.03 && last3.length >= 3 && !isDeload && !returning) return "declining";
  }
  const cutContext = isDeload || volumePhase === "cut" || volumePhase === "maintain";
  const spanDays = daysBetween(hist[0].date, today);
  if (!cutContext && spanDays >= 21) return "stalled";
  return "stable";
}

/**
 * Improvement rule: more reps at the same weight (±0.5 kg), or more weight at
 * the same or more reps. Assisted: less weight = more. Bodyweight: reps only.
 * @returns null or { kind: "reps"|"weight", repsDelta, weightDeltaKg }
 */
export function improvementOver(current, previous, flags = {}) {
  if (!current || !previous || !current.reps || !previous.reps) return null;
  if (flags.is_bodyweight) {
    return current.reps > previous.reps ? { kind: "reps", repsDelta: current.reps - previous.reps, weightDeltaKg: 0 } : null;
  }
  const same = sameWeightKg(current.weight_kg, previous.weight_kg);
  if (same) {
    return current.reps > previous.reps ? { kind: "reps", repsDelta: current.reps - previous.reps, weightDeltaKg: 0 } : null;
  }
  const heavier = flags.is_assisted ? current.weight_kg < previous.weight_kg : current.weight_kg > previous.weight_kg;
  if (heavier && current.reps >= previous.reps) {
    return { kind: "weight", repsDelta: current.reps - previous.reps, weightDeltaKg: Math.abs(current.weight_kg - previous.weight_kg) };
  }
  return null;
}

/**
 * PR detection against the stat BEFORE this session. Only when established.
 * @returns { prs: [{pr_kind, rep_bucket, previous_value, previous_date}], suspicious: boolean }
 */
export function detectPRs(stat, set) {
  const out = { prs: [], suspicious: false };
  if (!stat || stat.calibration_status !== "established" || !set?.reps) return out;
  const w = Number(set.weight_kg) || 0, r = set.reps;
  const bestAtWeight = (stat.best_reps_at_weight || []).find((b) => sameWeightKg(b.weight_kg, w));

  // Sanity check before recognition.
  const e = stat.is_assisted || stat.is_bodyweight ? null : epley(w, r);
  if (!stat.is_bodyweight && !stat.is_assisted && stat.best_weight_kg && w > stat.best_weight_kg * 1.3) out.suspicious = true;
  if (e && stat.best_e1rm_kg && e > stat.best_e1rm_kg * 1.2) out.suspicious = true;
  if (bestAtWeight && r >= bestAtWeight.reps * 2 && bestAtWeight.reps >= 3) out.suspicious = true;

  if (!stat.is_bodyweight && w > 0 && stat.best_weight_kg != null) {
    const heavier = stat.is_assisted ? w < stat.best_weight_kg - 0.5 : w > stat.best_weight_kg + 0.5;
    if (heavier) out.prs.push({ pr_kind: "weight", rep_bucket: repBucket(r), previous_value: stat.best_weight_kg, previous_date: stat.best_weight_date });
  }
  if (bestAtWeight && r > bestAtWeight.reps) {
    out.prs.push({ pr_kind: "reps_at_weight", rep_bucket: repBucket(r), previous_value: bestAtWeight.reps, previous_date: bestAtWeight.date });
  }
  if (e != null && r <= 15) {
    const bucket = repBucket(r);
    const prev = (stat.best_by_bucket || []).find((b) => b.bucket === bucket);
    if (prev && e > prev.e1rm_kg + 0.01 && !out.prs.length) {
      out.prs.push({ pr_kind: "rep_bucket", rep_bucket: bucket, previous_value: prev.e1rm_kg, previous_date: prev.date });
    }
  }
  return out;
}

/** Fold a just-logged set into an in-session copy of the stat so later sets compare correctly. */
export function foldSetIntoStat(stat, set, date) {
  if (!stat || !set?.reps) return stat;
  const one = applySession({ ...stat, exposures: (stat.exposures || 1) - 1 }, { workoutId: "session", date, sets: [set] });
  // Keep the real last_session / history (they describe the previous session).
  return { ...one, exposures: stat.exposures, calibration_status: stat.calibration_status, last_session: stat.last_session, session_history: stat.session_history };
}
