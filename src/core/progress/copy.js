/**
 * copy.js — small copy engine: keyed variants, a humor cadence (at most ~1
 * humorous line per 10 messages, never in recovery), a curse cadence (PRs and
 * milestones only, never twice in a row), and no immediate repeats.
 * State lives on ConsistencyProfile (humor_counter, recent_copy_keys).
 */

const RECENT_MAX = 12;

/**
 * Pick a variant.
 * @param key      message family, e.g. "complete.full_week"
 * @param variants [{ id, text, humor? }]
 * @param state    { humor_counter, recent_copy_keys }
 * @param opts     { allowHumor }
 * @returns { text, state }  new state to persist
 */
export function pickCopy(key, variants, state = {}, { allowHumor = true } = {}) {
  const recent = state.recent_copy_keys || [];
  const humorOk = allowHumor && (state.humor_counter || 0) >= 9;
  let pool = variants.filter((v) => (v.humor ? humorOk : true));
  const fresh = pool.filter((v) => !recent.includes(`${key}:${v.id}`));
  if (fresh.length) pool = fresh;
  // Prefer the humorous line when the cadence allows it.
  const chosen = (humorOk && pool.find((v) => v.humor)) || pool[Math.floor(Math.random() * pool.length)] || variants[0];
  const next = {
    humor_counter: chosen.humor ? 0 : (state.humor_counter || 0) + 1,
    recent_copy_keys: [...recent, `${key}:${chosen.id}`].slice(-RECENT_MAX),
  };
  return { text: chosen.text, state: next };
}

/** Week line for the completion sheet / status. */
export function weekLine({ counted, standard, target, isDeload = false, paused = false }) {
  if (paused) return "Week paused.";
  if (counted >= target) return "Full week.";
  if (counted >= standard) return `${counted} of ${target} this week. Standard's done.`;
  const need = standard - counted;
  return `${counted} of ${target} this week. ${need} to hold your standard.`;
}

/** Dashboard status line. */
export function statusLine({ counted, standard, target, isDeload = false, paused = false, returning = false, backOnTrack = false }) {
  if (paused) return "Week paused.";
  if (backOnTrack) return "Back on track.";
  if (isDeload && counted < target) return "Deload week. Lighter on purpose.";
  if (counted >= target) return "Full week.";
  if (counted >= standard) return `${counted} of ${target} this week. Standard's done.`;
  return `${counted} of ${target} this week.`;
}

export const COMPLETE_FULL_WEEK = [
  { id: "a", text: "Full week." },
  { id: "b", text: "Full week. Every session on the plan." },
  { id: "h", text: "Full week. {n} for {n}. Go eat something.", humor: true },
];

export const WORK_BANKED = [
  { id: "a", text: "Work banked." },
  { id: "b", text: "Work banked. That's how it adds up." },
];
