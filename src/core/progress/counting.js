/**
 * counting.js — what counts as a workout (docs/SFRMR_RULES.md → Counting).
 *
 * A workout counts toward the week when it is completed AND it is a quick
 * session or at least a third of its planned working sets were completed.
 * Warm-up / cool-down entries (exercise.section) and warm-up sets
 * (set_type "warmup") are never working sets.
 */

export function isWorkingExercise(ex) {
  return !!ex && !ex.section;
}

export function isWorkingSet(set) {
  return !!set && set.set_type !== "warmup";
}

function visibleExercises(workout) {
  const exs = workout?.exercises || [];
  // In a quick session, hidden exercises aren't part of the plan for today.
  if (workout?.session_type === "quick") return exs.filter((ex) => !ex.hidden_in_quick);
  return exs;
}

export function plannedWorkingSets(workout) {
  return visibleExercises(workout)
    .filter(isWorkingExercise)
    .reduce((n, ex) => n + (ex.sets_data || []).filter(isWorkingSet).length, 0);
}

export function completedWorkingSets(workout) {
  return (workout?.exercises || [])
    .filter(isWorkingExercise)
    .reduce((n, ex) => n + (ex.sets_data || []).filter((s) => isWorkingSet(s) && s.completed).length, 0);
}

/** Meets the counting rule (ignores the one-per-day rule, which is per week). */
export function isCountable(workout) {
  if (!workout?.completed || workout.skipped) return false;
  if (workout.session_type === "quick") return true;
  const planned = workout.planned_working_sets ?? plannedWorkingSets(workout);
  const done = workout.completed_working_sets ?? completedWorkingSets(workout);
  return done >= Math.ceil(planned / 3);
}

/** Local date a completed workout counts on (legacy fallback: completed_date / scheduled_date). */
export function workoutLocalDate(workout) {
  return (
    workout?.completed_local_date ||
    (workout?.completed_date || "").slice(0, 10) ||
    workout?.scheduled_date ||
    null
  );
}

/** Latest completed_at among logged sets (Date) or null. */
export function lastSetCompletedAt(workout) {
  let latest = null;
  for (const ex of workout?.exercises || []) {
    for (const s of ex.sets_data || []) {
      if (s?.completed && s.completed_at) {
        const t = new Date(s.completed_at);
        if (!latest || t > latest) latest = t;
      }
    }
  }
  return latest;
}

/** Minutes from started_at to the last completed set, capped at 240. */
export function durationMinutes(workout, endAt = null) {
  const start = workout?.started_at ? new Date(workout.started_at) : null;
  const end = endAt || lastSetCompletedAt(workout);
  if (!start || !end) return null;
  const mins = Math.round((end - start) / 60000);
  if (!Number.isFinite(mins) || mins <= 0) return null;
  return Math.min(mins, 240);
}
