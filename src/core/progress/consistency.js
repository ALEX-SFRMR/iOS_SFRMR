/**
 * consistency.js — the Standard / Target model (docs/SFRMR_RULES.md →
 * Consistency). Pure: callers pass data in, get plain objects back.
 */
import { addDays, daysBetween, weekStartFor } from "./dates.js";
import { isCountable, workoutLocalDate } from "./counting.js";

/** Suggested standard for a target: about half, rounded up, min 1. */
export function suggestedStandard(target) {
  return Math.max(1, Math.ceil((target || 1) / 2));
}

/**
 * The standard/target in effect for the week starting weekStart. A raise is
 * logged with next week's effective_week_start, so it never changes the
 * current week's evaluation.
 */
export function effectivePlanForWeek(profile, weekStart) {
  const history = [...(profile?.commitment_history || [])]
    .filter((h) => h && h.effective_week_start && h.effective_week_start <= weekStart)
    .sort((a, b) =>
      a.effective_week_start === b.effective_week_start
        ? String(a.changed_at || "").localeCompare(String(b.changed_at || ""))
        : a.effective_week_start.localeCompare(b.effective_week_start)
    );
  const last = history[history.length - 1];
  const target = Math.max(1, last?.target ?? profile?.target_per_week ?? 3);
  const standard = Math.min(target, Math.max(1, last?.standard ?? profile?.standard_per_week ?? suggestedStandard(target)));
  return { standard, target };
}

/**
 * Build the commitment_history entries for a change. Lowering applies to the
 * current week; raising applies from next week. If one number goes down and
 * the other up, the lowered number applies now and the raise next week.
 */
export function commitmentChange(profile, { standard, target }, currentWeekStart, reason = "user") {
  const now = new Date().toISOString();
  const cur = effectivePlanForWeek(profile, currentWeekStart);
  const nextWeek = addDays(currentWeekStart, 7);
  const entries = [];
  const lowerNowStandard = Math.min(standard, cur.standard);
  const lowerNowTarget = Math.min(target, cur.target);
  if (lowerNowStandard !== cur.standard || lowerNowTarget !== cur.target || !profile?.setup_completed_at) {
    // First setup applies now in full.
    const s = profile?.setup_completed_at ? lowerNowStandard : standard;
    const t = profile?.setup_completed_at ? lowerNowTarget : target;
    entries.push({ standard: Math.min(s, t), target: t, effective_week_start: currentWeekStart, changed_at: now, reason });
  }
  if (profile?.setup_completed_at && (standard > cur.standard || target > cur.target)) {
    entries.push({ standard: Math.min(standard, target), target, effective_week_start: nextWeek, changed_at: now, reason });
  }
  return entries;
}

/** True when the pause on the profile covers any day of the week. */
export function pauseCoversWeek(profile, weekStart) {
  const p = profile?.pause;
  if (!p?.active || !p.start_date) return false;
  const weekEnd = addDays(weekStart, 6);
  if (p.start_date > weekEnd) return false;
  if (p.end_date && p.end_date < weekStart) return false;
  return true;
}

/**
 * Evaluate one week.
 * @param {object} args
 *   profile       ConsistencyProfile
 *   weekStart     yyyy-MM-dd
 *   workouts      completed workouts (any week; filtered here)
 *   existing      existing TrainingWeek row (keeps pause state)
 *   today         yyyy-MM-dd (user local)
 *   isDeload      boolean
 * @returns fields for the TrainingWeek row
 */
export function evaluateWeek({ profile, weekStart, workouts, existing, today, isDeload = false, setupDate = null }) {
  const weekEnd = addDays(weekStart, 6);
  const inWeek = (workouts || []).filter((w) => {
    const d = workoutLocalDate(w);
    return w.completed && !w.skipped && d && d >= weekStart && d <= weekEnd;
  });
  // One counted workout per local day; earliest completion wins.
  const countable = inWeek
    .filter(isCountable)
    .sort((a, b) => {
      const da = workoutLocalDate(a), db = workoutLocalDate(b);
      if (da !== db) return da.localeCompare(db);
      return String(a.completed_date || "").localeCompare(String(b.completed_date || ""));
    });
  const countedIds = [];
  const countedDates = [];
  for (const w of countable) {
    const d = workoutLocalDate(w);
    if (countedDates.includes(d)) continue;
    countedDates.push(d);
    countedIds.push(w.id);
  }
  const trainingMinutes = inWeek.reduce((n, w) => n + (w.duration_minutes || 0), 0);

  let { standard, target } = effectivePlanForWeek(profile, weekStart);
  const isFreeWeek = !!profile?.first_week_start && weekStart === profile.first_week_start;
  if (isFreeWeek) {
    // Prorate from the setup day (inclusive) to the end of the week.
    const from = setupDate && setupDate >= weekStart && setupDate <= weekEnd ? setupDate : weekStart;
    const daysRemaining = daysBetween(from, weekEnd) + 1;
    target = Math.max(1, Math.ceil((target * daysRemaining) / 7));
    standard = Math.min(standard, target);
  }

  const counted = countedIds.length;
  const closed = weekEnd < today;
  const paused = existing?.status === "paused" || pauseCoversWeek(profile, weekStart);

  let status;
  if (paused) status = "paused";
  else if (!closed) status = "in_progress";
  else if (counted >= target) status = "full";
  else if (counted >= standard) status = "standard_met";
  else if (isFreeWeek) status = "free_week";
  else status = "below_standard";

  return {
    week_start_date: weekStart,
    week_end_date: weekEnd,
    standard,
    target,
    counted_workouts: counted,
    counted_workout_ids: countedIds,
    counted_dates: countedDates,
    training_minutes: trainingMinutes,
    status,
    closed,
    is_deload: !!isDeload,
    is_free_week: isFreeWeek,
  };
}

/** Did this (possibly open) week hold the standard? */
export function weekHeldStandard(week) {
  if (!week) return false;
  if (week.status === "full" || week.status === "standard_met") return true;
  return week.status === "in_progress" && week.counted_workouts >= week.standard;
}

/**
 * Streak = consecutive closed weeks holding the standard, ending at the most
 * recent closed week. Paused weeks and unmet free weeks are skipped (neutral).
 * +1 if the current week already met its standard.
 * @param weeks  TrainingWeek rows (any order)
 * @param currentWeekStart yyyy-MM-dd
 */
export function computeStreak(weeks, currentWeekStart) {
  const closed = (weeks || [])
    .filter((w) => w.week_start_date < currentWeekStart)
    .sort((a, b) => b.week_start_date.localeCompare(a.week_start_date));
  let streak = 0;
  for (const w of closed) {
    if (w.status === "paused" || w.status === "free_week") continue;
    if (w.status === "full" || w.status === "standard_met") streak += 1;
    else break;
  }
  const current = (weeks || []).find((w) => w.week_start_date === currentWeekStart);
  if (current && current.status !== "paused" && current.counted_workouts >= current.standard && current.counted_workouts > 0) {
    streak += 1;
  }
  return streak;
}

/** Longest run of standard-holding weeks (paused / unmet free weeks neutral). */
export function computeLongestStreak(weeks) {
  const sorted = [...(weeks || [])].sort((a, b) => a.week_start_date.localeCompare(b.week_start_date));
  let best = 0, run = 0;
  for (const w of sorted) {
    if (w.status === "paused" || w.status === "free_week") continue;
    if (weekHeldStandard(w)) { run += 1; best = Math.max(best, run); }
    else if (w.status !== "in_progress") run = 0;
  }
  return best;
}

/**
 * Lifetime totals from all completed workouts (history included):
 * lifetime_workouts = every completed, non-skipped workout;
 * lifetime_weeks_trained = distinct weeks with >= 1 countable workout.
 */
export function computeLifetime(workouts, weekStartDay = 1) {
  const done = (workouts || []).filter((w) => w.completed && !w.skipped);
  const weeks = new Set();
  let lastCounted = null;
  for (const w of done) {
    if (!isCountable(w)) continue;
    const d = workoutLocalDate(w);
    if (!d) continue;
    weeks.add(weekStartFor(d, weekStartDay));
    if (!lastCounted || d > lastCounted) lastCounted = d;
  }
  return { lifetime_workouts: done.length, lifetime_weeks_trained: weeks.size, last_counted_workout_date: lastCounted };
}

/** Week starts from `from` through `to` inclusive (both week starts). Capped. */
export function weekStartsBetween(from, to, cap = 260) {
  const out = [];
  let w = from;
  while (w <= to && out.length < cap) { out.push(w); w = addDays(w, 7); }
  return out;
}
