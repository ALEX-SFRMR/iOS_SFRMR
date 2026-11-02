/**
 * milestones.js — the recognition model's milestone definitions
 * (Identity doc §7). Pure: compares state before/after an event.
 */

export const LIFETIME_NOTICEABLE = [10, 25, 50];
export const LIFETIME_CELEBRATORY = [100, 250, 500, 1000];
export const STREAK_NOTICEABLE = [4, 8];
export const STREAK_CELEBRATORY = [12, 26, 52];

// Order used to pick the "biggest" when several land at once.
const RANK = (m) => {
  if (m.level === "celebratory") {
    if (m.kind === "main_lift_weight_pr") return 900;
    if (m.kind.startsWith("lifetime_")) return 800 + Math.log10(m.value || 1);
    if (m.kind.startsWith("streak_")) return 700 + m.value / 100;
    if (m.kind === "block_complete") return 650;
    if (m.kind === "one_year") return 640;
    if (m.kind === "first_workout") return 600;
    return 500;
  }
  return 100;
};

export function biggestMilestone(list) {
  return [...(list || [])].sort((a, b) => RANK(b) - RANK(a))[0] || null;
}

/**
 * Milestones reached by a workout completion.
 * @param before  { lifetime_workouts, current_streak_weeks }
 * @param after   { lifetime_workouts, current_streak_weeks }
 * @param weekBefore / weekAfter  { counted_workouts, standard, target }
 * @param achieved Set of "kind" or "kind:value" strings already recorded
 * @param blockComplete boolean
 */
export function milestonesForCompletion({ before, after, weekBefore, weekAfter, achieved = new Set(), blockComplete = false, weekStart, firstStandardWeekEver = false }) {
  const out = [];
  const add = (kind, level, value = null, onceKey = kind) => {
    if (achieved.has(onceKey)) return;
    out.push({ kind, level, value, once_key: onceKey });
  };
  const lb = before?.lifetime_workouts || 0, la = after?.lifetime_workouts || 0;
  if (lb === 0 && la >= 1) add("first_workout", "celebratory", 1);
  for (const n of LIFETIME_NOTICEABLE) if (lb < n && la >= n) add(`lifetime_${n}`, "noticeable", n);
  for (const n of LIFETIME_CELEBRATORY) if (lb < n && la >= n) add(`lifetime_${n}`, "celebratory", n);

  const sb = before?.current_streak_weeks || 0, sa = after?.current_streak_weeks || 0;
  for (const n of STREAK_NOTICEABLE) if (sb < n && sa >= n) add(`streak_${n}`, "noticeable", n);
  for (const n of STREAK_CELEBRATORY) if (sb < n && sa >= n) add(`streak_${n}`, "celebratory", n);

  const cb = weekBefore?.counted_workouts || 0, ca = weekAfter?.counted_workouts || 0;
  if (weekAfter && cb < weekAfter.standard && ca >= weekAfter.standard) {
    if (firstStandardWeekEver) add("first_standard_week", "noticeable", ca);
  }
  if (weekAfter && cb < weekAfter.target && ca >= weekAfter.target) {
    add("full_week", "noticeable", ca, `full_week:${weekStart}`);
  }
  if (blockComplete) add("block_complete", "celebratory", null, `block_complete:${weekStart}`);
  return out;
}

/** One-line text for a milestone (template, not AI). */
export function milestoneLine(m) {
  const v = m.value;
  switch (true) {
    case m.kind === "first_workout": return "First workout. Everything starts here.";
    case m.kind === "first_standard_week": return "First week holding your standard.";
    case m.kind === "full_week": return null; // The week line already says "Full week."
    case m.kind === "block_complete": return "Block complete.";
    case m.kind === "main_lift_weight_pr": return null;
    case m.kind === "back_on_track": return "Back on track.";
    case m.kind === "one_year": return "One year with SFRMR.";
    case m.kind.startsWith("lifetime_"):
      if (v >= 100) return v === 100 ? "100 workouts. That's not a phase anymore." : `${v} workouts. That's who you are now.`;
      return `${v} workouts in the bank.`;
    case m.kind.startsWith("streak_"): return `${v} weeks holding your standard.`;
    default: return null;
  }
}

/** Big number + line for the full-screen moment. */
export function milestoneMoment(m) {
  if (m.kind === "first_workout") return { number: "1", line: "First workout. Everything starts here." };
  if (m.kind.startsWith("lifetime_")) return { number: String(m.value), line: m.value === 100 ? "100 workouts. That's not a phase anymore." : "workouts. That's who you are now." };
  if (m.kind.startsWith("streak_")) return { number: String(m.value), line: "weeks holding your standard." };
  if (m.kind === "block_complete") return { number: "Block", line: "complete. On to the next one." };
  if (m.kind === "one_year") return { number: "1", line: "year training with SFRMR." };
  return { number: "", line: milestoneLine(m) || "" };
}
