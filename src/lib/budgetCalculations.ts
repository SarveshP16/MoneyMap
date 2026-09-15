// Ported from budget_calculations.dart.

import type { BudgetPeriod, Category, Transaction } from './types';
import { dateOnly } from './dates';

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

/** When the current budget period for `period` started, as of `today`. */
export function periodStart(period: BudgetPeriod, today: Date): Date {
  const t = dateOnly(today);
  switch (period) {
    case 'weekly': {
      // Dart weekday: Monday=1..Sunday=7. JS getDay(): Sunday=0..Saturday=6.
      const weekday = t.getDay() === 0 ? 7 : t.getDay();
      return new Date(t.getFullYear(), t.getMonth(), t.getDate() - (weekday - 1));
    }
    case 'fortnightly':
      return currentFortnightRange(t).start;
    case 'monthly':
      return new Date(t.getFullYear(), t.getMonth(), 1);
  }
}

/** Total spent in `category` since its current budget period started. */
export function spentInCurrentPeriod(
  transactions: Transaction[],
  category: Category,
  today: Date,
): number {
  const start = periodStart(category.period, today);
  return transactions
    .filter((t) => t.categoryId === category.id && dateOnly(new Date(t.date)) >= start)
    .reduce((sum, t) => sum + t.amount, 0);
}
