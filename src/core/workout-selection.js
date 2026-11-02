import { format } from "date-fns";

// Queue order: a workout moved up after a priority skip (queue_priority < 0)
// goes first; then by week, then scheduled date (ties), then order within the day.
export const sortByOrder = (a, b) => {
  const pa = a.queue_priority ?? 0;
  const pb = b.queue_priority ?? 0;
  if (pa !== pb) return pa - pb;
  if ((a.week_number || 0) !== (b.week_number || 0)) return (a.week_number || 0) - (b.week_number || 0);
  const da = a.scheduled_date || "";
  const db = b.scheduled_date || "";
  if (da !== db) return da.localeCompare(db);
  return (a.workout_order || 0) - (b.workout_order || 0);
};

// Resolved for queue purposes: completed or skipped. Skipped workouts never
// count toward the week or lifetime totals — this is queue-only.
export function isResolved(w) {
  return !!(w && (w.completed || w.skipped));
}

// There is no explicit "in progress" status on the Workout entity, so we infer
// it: a workout is in progress when it isn't completed yet but already has at
// least one logged (completed) set.
export function isWorkoutInProgress(w) {
  if (!w || w.completed || w.skipped) return false;
  return (w.exercises || []).some((ex) =>
    (ex.sets_data || []).some((s) => s && s.completed)
  );
}

// The unresolved workouts, in queue order.
export function queuedWorkouts(workouts, excludeId = null) {
  return (workouts || [])
    .filter((w) => !isResolved(w) && w.id !== excludeId)
    .sort(sortByOrder);
}

// Pick the workout to surface as "current" on the dashboard / training button.
// Priority:
//   1. An in-progress (started but not completed) workout.
//   2. A workout completed today, so a freshly-finished workout stays visible
//      instead of instantly jumping to the next one.
//   3. The next unresolved workout in the queue.
export function pickCurrentWorkout(workouts) {
  if (!workouts || workouts.length === 0) return null;

  const incomplete = queuedWorkouts(workouts);

  const inProgress = incomplete.filter(isWorkoutInProgress);
  if (inProgress.length > 0) return inProgress[0];

  const today = format(new Date(), "yyyy-MM-dd");
  const completedToday = workouts
    .filter(
      (w) => w.completed && (w.completed_local_date || (w.completed_date || "").slice(0, 10)) === today
    )
    .sort(sortByOrder);
  if (completedToday.length > 0) return completedToday[completedToday.length - 1];

  return incomplete[0] || null;
}
