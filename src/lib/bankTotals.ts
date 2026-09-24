import type { BankAllocation, BankColumn } from './types';

export const UNASSIGNED_BANK = 'Unassigned';

export interface BankTotal {
  label: string;
  total: number;
  /** Fraction of the whole pay, 0–1. */
  share: number;
}

/** The whole pay — simply every row's amount added up. */
export function totalPay(rows: BankAllocation[]): number {
  return rows.reduce((sum, r) => sum + r.amount, 0);
}

/** What each bank account receives, largest first. Bank names are free
 *  text, so grouping ignores case and surrounding spaces ("MQ" and "mq "
 *  are the same account) and shows whichever spelling was typed first.
 *  Rows with no bank set land in one shared bucket so their money still
 *  counts toward the total instead of vanishing from the breakdown. */
export function totalsByBank(rows: BankAllocation[]): BankTotal[] {
  const pay = totalPay(rows);
  const groups = new Map<string, { label: string; total: number }>();
  for (const r of rows) {
    const name = r.bankAccount.trim();
    const key = name.toLowerCase();
    const group = groups.get(key) ?? { label: name || UNASSIGNED_BANK, total: 0 };
    group.total += r.amount;
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((g) => g.total > 0)
    .map((g) => ({ ...g, share: pay > 0 ? g.total / pay : 0 }))
    .sort((a, b) => b.total - a.total);
}

export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/,/g, '').trim();
  if (cleaned === '') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Sum of a number column across all rows — non-numeric cells count as 0. */
export function columnTotal(rows: BankAllocation[], column: BankColumn): number {
  return rows.reduce((sum, r) => {
    const n = Number((r.extras?.[column.id] ?? '').replace(/,/g, ''));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/** A 0–1 fraction as a percent — whole numbers once it's 10% or more, one
 *  decimal below that so a small share doesn't round to a misleading 0%.
 *  null (no pay to take a share of) renders as a dash. */
export function formatShare(share: number | null): string {
  if (share == null) return '—';
  const pct = share * 100;
  return `${pct >= 10 || Number.isInteger(pct) ? Math.round(pct) : pct.toFixed(1)}%`;
}
