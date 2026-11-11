// Budget-warning logic backing the "Budget alerts" card and notifications —
// no Dart original to port from (Pulse had no equivalent), but it reuses
// budgetCalculations.ts's period math so a "warning" and the Budgets page's
// own over-budget highlight always agree on what's spent.

import type { Category, Subscription, Transaction } from './types';
import { budgetStatus, periodStart } from './budgetCalculations';
import { dateOnly } from './dates';

const NEAR_BUDGET_RATIO = 0.8;

export interface BudgetWarning {
  category: Category;
  spent: number;
  /** After carry-over (BudgetStatus.budget). */
  budget: number;
  /** Owed from carry-over (BudgetStatus.debt); 0 when not in debt. */
  debt: number;
  ratio: number;
  severity: 'over' | 'near';
  /** ISO date the current period started — a stable key for "have I
   *  already warned about this period" (per-period, not per-day, so an
   *  ongoing over-budget category nudges once a period rather than daily). */
  periodKey: string;
}

/** Categories at or approaching their budget for the current period —
 *  "near" from 80% up to (not including) 100%, "over" at 100%+. Categories
 *  with no budget set are left out, the same check CategoryCard itself
 *  uses. Sorted worst-first. */
export function budgetWarnings(categories: Category[], transactions: Transaction[], today: Date): BudgetWarning[] {
  const warnings: BudgetWarning[] = [];
  for (const category of categories) {
    const { spent, budget, debt } = budgetStatus(category, transactions, today);
    if (budget == null || (budget <= 0 && debt === 0)) continue;
    // In debt from carry-over, the budget is 0 — always "over", sorted first.
    const ratio = debt > 0 ? Infinity : spent / budget;
    if (ratio < NEAR_BUDGET_RATIO) continue;
    warnings.push({
      category,
      spent,
      budget,
      debt,
      ratio,
      severity: ratio >= 1 ? 'over' : 'near',
      periodKey: periodStart(category, today).toISOString(),
    });
  }
  return warnings.sort((a, b) => b.ratio - a.ratio);
}

/** Whether `subscription`'s cycle due on `dueDate` has already been logged
 *  as a transaction via "Log payment". */
export function isLoggedForDueDate(subscription: Subscription, dueDate: Date): boolean {
  if (!subscription.lastLoggedDate) return false;
  return dateOnly(new Date(subscription.lastLoggedDate)).getTime() === dateOnly(dueDate).getTime();
}
