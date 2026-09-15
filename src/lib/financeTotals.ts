// Ported from finance_totals.dart, savings_totals.dart, investments_totals.dart,
// subscription_totals.dart, income_totals.dart and financial_year.dart.

import type { IncomeRecord, Investment, SavingsGoal, Subscription, Transaction } from './types';
import { subscriptionMonthlyAmount } from './types';

export const totalSpent = (transactions: Transaction[]): number =>
  transactions.reduce((sum, t) => sum + t.amount, 0);

/** Sum of outstanding split amounts — money someone else owes back on a
 *  shared expense that hasn't been marked paid back yet. */
export const totalOwedToYou = (transactions: Transaction[]): number =>
  transactions
    .filter((t) => t.splitAmount != null && !t.splitPaidBack)
    .reduce((sum, t) => sum + (t.splitAmount ?? 0), 0);

export const totalSavings = (goals: SavingsGoal[]): number =>
  goals.reduce((sum, g) => sum + g.currentAmount, 0);

export const totalInvestmentsValue = (investments: Investment[]): number =>
  investments.reduce((sum, i) => sum + i.currentValue, 0);

/** Combined monthly-equivalent cost across subscriptions/bills. */
export const monthlyTotal = (items: Subscription[]): number =>
  items.reduce((sum, s) => sum + subscriptionMonthlyAmount(s), 0);

// --- Financial year -------------------------------------------------------
// Australia's financial year runs 1 Jul – 30 Jun; every other currency
// falls back to the plain calendar year (1 Jan – 31 Dec).

export function financialYearLabel(date: Date, isAustralian: boolean): string {
  if (!isAustralian) return `${date.getFullYear()}`;
  const startYear = date.getMonth() >= 6 /* Jul is index 6 */ ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

export function financialYearRange(startYear: number, isAustralian: boolean): { start: Date; end: Date } {
  if (!isAustralian) return { start: new Date(startYear, 0, 1), end: new Date(startYear, 11, 31) };
  return { start: new Date(startYear, 6, 1), end: new Date(startYear + 1, 5, 30) };
}

export function currentFinancialYearRange(isAustralian: boolean): { start: Date; end: Date } {
  const now = new Date();
  if (!isAustralian) return financialYearRange(now.getFullYear(), false);
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return financialYearRange(startYear, true);
}

/** Sum of gross income received within the reporting year containing today. */
export function totalIncomeForCurrentFinancialYear(
  records: IncomeRecord[],
  isAustralian: boolean,
): number {
  const { start, end } = currentFinancialYearRange(isAustralian);
  return records
    .filter((r) => {
      const d = new Date(r.dateReceived);
      return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
    })
    .reduce((sum, r) => sum + r.grossAmount, 0);
}
