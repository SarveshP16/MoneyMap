// Ported from transaction_filtering.dart + the TransactionFilter shape from
// transactions_providers.dart.

import type { Transaction } from './types';
import { dateOnly } from './dates';

export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  paymentMethodId?: string;
  minAmount?: number;
  maxAmount?: number;
  /** Matches Transaction.splitOwedByName exactly — one of the names already
   *  typed on some split expense, not free text. */
  owedByName?: string;
  /** true = only expenses currently flagged "moved to credit card" (still
   *  awaiting reconciliation against the statement); false = only ones
   *  that aren't; undefined = either. */
  movedToCreditCard?: boolean;
}

export const EMPTY_FILTER: TransactionFilter = {};

export function isFilterActive(filter: TransactionFilter): boolean {
  return (
    filter.startDate != null ||
    filter.endDate != null ||
    filter.categoryId != null ||
    filter.paymentMethodId != null ||
    filter.minAmount != null ||
    filter.maxAmount != null ||
    filter.owedByName != null ||
    filter.movedToCreditCard != null
  );
}

/** Transactions matching `filter`, newest first. */
export function applyTransactionFilter(
  transactions: Transaction[],
  filter: TransactionFilter,
): Transaction[] {
  const filtered = transactions.filter((t) => {
    const txDate = new Date(t.date);
    if (filter.startDate != null && txDate < dateOnly(new Date(filter.startDate))) return false;
    if (filter.endDate != null && txDate > dateOnly(new Date(filter.endDate))) return false;
    if (filter.categoryId != null && t.categoryId !== filter.categoryId) return false;
    if (filter.paymentMethodId != null && t.paymentMethodId !== filter.paymentMethodId) return false;
    if (filter.minAmount != null && t.amount < filter.minAmount) return false;
    if (filter.maxAmount != null && t.amount > filter.maxAmount) return false;
    if (filter.owedByName != null) {
      // Filtering by who owes you narrows to what's still outstanding — a
      // split marked paid back drops out of this view (the expense itself
      // is untouched everywhere else).
      if (t.splitOwedByName !== filter.owedByName || t.splitPaidBack) return false;
    }
    if (filter.movedToCreditCard != null && t.movedToCreditCard !== filter.movedToCreditCard) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (byDate !== 0) return byDate;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return filtered;
}

/** Every distinct splitOwedByName already typed on some split expense,
 *  alphabetically. */
export function distinctOwedByNames(transactions: Transaction[]): string[] {
  const names = new Set<string>();
  for (const t of transactions) {
    if (t.splitOwedByName) names.add(t.splitOwedByName);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}
