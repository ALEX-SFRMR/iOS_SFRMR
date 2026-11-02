/**
 * dates.js — calendar math for the progress system.
 *
 * Every date the progress system stores is a plain "yyyy-MM-dd" string in the
 * user's local timezone. Math on those strings is done in UTC so DST shifts
 * never move a day. Pure functions only (ported to Swift later).
 */

/** Device IANA timezone, e.g. "America/Chicago". */
export function deviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** The local calendar date ("yyyy-MM-dd") of `date` in timezone `tz`. */
export function localDateString(date = new Date(), tz = deviceTimezone()) {
  const d = date instanceof Date ? date : new Date(date);
  try {
    // en-CA formats as yyyy-MM-dd.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** Local hour (0-23) of `date` in timezone `tz`. */
export function localHour(date = new Date(), tz = deviceTimezone()) {
  try {
    const h = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(date);
    return parseInt(h, 10) % 24;
  } catch {
    return date.getHours();
  }
}

function toUTC(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUTC(dt) {
  return dt.toISOString().slice(0, 10);
}

/** dateStr plus n days. */
export function addDays(dateStr, n) {
  const dt = toUTC(dateStr);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUTC(dt);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a, b) {
  return Math.round((toUTC(b) - toUTC(a)) / 86400000);
}

/** ISO weekday 1 (Mon) .. 7 (Sun) of a date string. */
export function isoWeekday(dateStr) {
  const d = toUTC(dateStr).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Start of the week containing dateStr, for weeks starting on weekStartDay (1 = Monday). */
export function weekStartFor(dateStr, weekStartDay = 1) {
  const diff = (isoWeekday(dateStr) - weekStartDay + 7) % 7;
  return addDays(dateStr, -diff);
}

/** Short weekday name ("Mon") for a date string. */
export function weekdayShort(dateStr) {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][isoWeekday(dateStr) - 1];
}

/** Long weekday name ("Monday") for a date string. */
export function weekdayLong(dateStr) {
  return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][isoWeekday(dateStr) - 1];
}
