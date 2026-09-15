/** Date-only helpers shared by the ported budget/subscription logic — all
 *  operate on local calendar dates, matching the Dart originals' use of
 *  DateTime(y, m, d) rather than any UTC/Duration arithmetic (which would
 *  drift across DST transitions). */

export function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

export function clampedDayOfMonth(year: number, month: number, day: number): Date {
  // month is 0-based here (JS convention); day 0 of the *next* month gives
  // the last day of `month`.
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, daysInMonth));
}

export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

export function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}

export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

/** Parses a `<input type="date">` value ("YYYY-MM-DD") as a *local*
 *  midnight Date. `new Date("YYYY-MM-DD")` parses as UTC per spec, which
 *  silently shifts the date by a day in any timezone behind UTC once it
 *  round-trips through local getters (dateOnly, formatIsoDate, ...) — this
 *  is the one place that string should ever be turned into a Date. */
export function parseIsoDateLocal(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const fullDateFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/** Relative label for a date: "Today" / "Tomorrow" / "Yesterday", else e.g.
 *  "Mon, Aug 31" (year appended only when it differs from this year).
 *  Ported from date_format.dart's formatRelativeDate. */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const today = dateOnly(now);
  const target = dateOnly(date);
  const diff = daysBetween(today, target);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  const base = fullDateFormat.format(date);
  return date.getFullYear() === now.getFullYear() ? base : `${base}, ${date.getFullYear()}`;
}
