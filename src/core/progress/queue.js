/**
 * queue.js — soft projected dates for the workout queue (Identity doc §8).
 * The program is a queue, not a calendar: incomplete workouts never show a
 * past date or the words overdue / missed / behind. Display only; the stored
 * scheduled_date is never changed.
 */
import { addDays, isoWeekday, weekdayShort } from "./dates.js";

/**
 * Training weekdays from a WeeklyPlanTemplate (day_of_week 0 = Sunday).
 * @returns array of ISO weekdays (1 = Mon .. 7 = Sun), or [] when no pattern.
 */
export function trainingWeekdays(template) {
  const days = (template?.workout_schedule || [])
    .filter((d) => (d.workouts || []).length > 0 && d.day_of_week != null)
    .map((d) => (d.day_of_week === 0 ? 7 : d.day_of_week));
  return [...new Set(days)].sort((a, b) => a - b);
}

/**
 * Projected dates for the queue, starting today.
 * @param queue ordered unresolved workouts
 * @param weekdays ISO weekdays of the pattern
 * @param today yyyy-MM-dd
 * @param trainedToday skip today when a workout already counted today
 * @returns Map(workoutId → { date, label })
 */
export function projectQueue(queue, weekdays, today, { trainedToday = false } = {}) {
  const out = new Map();
  if (!weekdays?.length) {
    queue.forEach((w, i) => out.set(w.id, { date: null, label: i === 0 ? "Next up" : "Then" }));
    return out;
  }
  let d = trainedToday ? addDays(today, 1) : today;
  for (const w of queue) {
    let guard = 0;
    while (!weekdays.includes(isoWeekday(d)) && guard < 8) { d = addDays(d, 1); guard++; }
    out.set(w.id, { date: d, label: d === today ? "Today" : d === addDays(today, 1) ? "Tomorrow" : weekdayShort(d) });
    d = addDays(d, 1);
  }
  return out;
}
