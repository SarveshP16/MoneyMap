// Ported from budget_calculations.dart.

import type { Category, Transaction } from './types';
import { addDays, clampedDayOfMonth, dateOnly, daysBetween, parseIsoDateLocal } from './dates';

/** The current fortnight: always a 14-day window ending on a Wednesday
 *  (and containing `today`) — same boundaries as the original app. */
export function currentFortnightRange(today: Date): { start: Date; end: Date } {
  const t = dateOnly(today);
  // JS Date#getDay(): Sunday=0..Saturday=6. Shift to Monday=0..Sunday=6 to
  // match the Dart port's "python weekday" convention.
  const pythonWeekday = (t.getDay() + 6) % 7;
  const daysUntilWednesday = ((2 - pythonWeekday) % 7 + 7) % 7;
  const end = new Date(t.getFullYear(), t.getMonth(), t.getDate() + daysUntilWednesday);
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 13);
  return { start, end };
}

type PeriodSettings = Pick<Category, 'period' | 'periodAnchor'>;

/** The budget period containing `today`, both ends inclusive. */
export function periodRange(category: PeriodSettings, today: Date): { start: Date; end: Date } {
  const t = dateOnly(today);
  const anchor = category.periodAnchor ? parseIsoDateLocal(category.periodAnchor) : undefined;
  switch (category.period) {
    case 'weekly': {
      const startDay = anchor ? anchor.getDay() : 1; // Monday unless anchored
      const start = addDays(t, -((t.getDay() - startDay + 7) % 7));
      return { start, end: addDays(start, 6) };
    }
    case 'fortnightly': {
      if (!anchor) return currentFortnightRange(t);
      // Math.floor, not truncation, so dates before the anchor land in the right fortnight too.
      const start = addDays(anchor, Math.floor(daysBetween(anchor, t) / 14) * 14);
      return { start, end: addDays(start, 13) };
    }
    case 'monthly': {
      const day = anchor ? anchor.getDate() : 1;
      let start = clampedDayOfMonth(t.getFullYear(), t.getMonth(), day);
      if (start > t) start = clampedDayOfMonth(t.getFullYear(), t.getMonth() - 1, day);
      const next = clampedDayOfMonth(start.getFullYear(), start.getMonth() + 1, day);
      return { start, end: addDays(next, -1) };
    }
  }
}

/** When the current budget period started, as of `today`. */
export function periodStart(category: PeriodSettings, today: Date): Date {
  return periodRange(category, today).start;
}

/** Total spent in `category` in its current budget period. */
export function spentInCurrentPeriod(
  transactions: Transaction[],
  category: Category,
  today: Date,
): number {
  const { start, end } = periodRange(category, today);
  return transactions
    .filter((t) => {
      if (t.categoryId !== category.id) return false;
      const day = dateOnly(new Date(t.date));
      return day >= start && day <= end;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}
