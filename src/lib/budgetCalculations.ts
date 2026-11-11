// Ported from budget_calculations.dart.

import type { Category, Transaction } from './types';
import { addDays, clampedDayOfMonth, dateOnly, daysBetween, formatIsoDate, parseIsoDateLocal } from './dates';

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

type RolloverFields = Pick<Category, 'rolloverSince' | 'budgetHistory'>;

/** The carry-over fields to save for a category edited in the form.
 *  Turning carry-over on, or changing its period or start date, starts the
 *  running balance afresh from the current period; changing only the
 *  amount records it from the current period on, so earlier periods keep
 *  the amount they were budgeted with. */
export function nextRolloverFields(
  previous: Category | undefined,
  next: Pick<Category, 'period' | 'periodAnchor' | 'budgetAmount'>,
  rolloverOn: boolean,
  today: Date,
): RolloverFields {
  if (!rolloverOn || !next.periodAnchor || next.budgetAmount == null) {
    return { rolloverSince: undefined, budgetHistory: undefined };
  }
  const currentStart = formatIsoDate(periodRange(next, today).start);
  if (!previous?.rolloverSince || previous.period !== next.period || previous.periodAnchor !== next.periodAnchor) {
    return { rolloverSince: currentStart, budgetHistory: undefined };
  }
  if (previous.budgetAmount === next.budgetAmount) {
    return { rolloverSince: previous.rolloverSince, budgetHistory: previous.budgetHistory };
  }
  const history = previous.budgetHistory?.length
    ? previous.budgetHistory
    : [{ from: previous.rolloverSince, amount: previous.budgetAmount ?? 0 }];
  return {
    rolloverSince: previous.rolloverSince,
    budgetHistory: [...history.filter((h) => h.from < currentStart), { from: currentStart, amount: next.budgetAmount }],
  };
}

/** Where a category's budget stands in its current period, carry-over included. */
export interface BudgetStatus {
  /** Spent in the current period. */
  spent: number;
  /** The category's own amount for this period, before carry-over. */
  base?: number;
  /** Rolled in from earlier periods: positive is saved up, negative is
   *  owed. Always 0 without carry-over. */
  carriedIn: number;
  /** What there is to spend this period (base + carriedIn), never below 0. */
  budget?: number;
  /** Once earlier overspending has used up this period's whole budget:
   *  what's still owed, plus anything spent on top of it. Otherwise 0. */
  debt: number;
}

const roundCents = (n: number) => Math.round(n * 100) / 100;

function baseAmountFor(category: Category, periodStartDate: Date): number | undefined {
  const history = category.budgetHistory;
  if (!history || history.length === 0) return category.budgetAmount;
  let amount = history[0].amount;
  for (const change of history) {
    if (parseIsoDateLocal(change.from) <= periodStartDate) amount = change.amount;
  }
  return amount;
}

export function budgetStatus(category: Category, transactions: Transaction[], today: Date): BudgetStatus {
  const own = transactions.filter((t) => t.categoryId === category.id);
  const spentIn = ({ start, end }: { start: Date; end: Date }) =>
    roundCents(
      own
        .filter((t) => {
          const day = dateOnly(new Date(t.date));
          return day >= start && day <= end;
        })
        .reduce((sum, t) => sum + t.amount, 0),
    );

  const current = periodRange(category, today);
  const spent = spentIn(current);
  if (!category.rolloverSince || !category.periodAnchor || category.budgetAmount == null) {
    return { spent, base: category.budgetAmount, carriedIn: 0, budget: category.budgetAmount, debt: 0 };
  }

  // Each finished period passes on what it had (its own amount plus what it
  // was handed) minus what it spent — a running balance, so a big overspend
  // keeps being paid back over as many periods as it takes.
  let carried = 0;
  let range = periodRange(category, parseIsoDateLocal(category.rolloverSince));
  while (range.start < current.start) {
    carried = roundCents(carried + (baseAmountFor(category, range.start) ?? 0) - spentIn(range));
    range = periodRange(category, addDays(range.end, 1));
  }

  const base = baseAmountFor(category, current.start) ?? 0;
  const available = roundCents(base + carried);
  return {
    spent,
    base,
    carriedIn: carried,
    budget: Math.max(0, available),
    debt: available <= 0 ? roundCents(spent - available) : 0,
  };
}
