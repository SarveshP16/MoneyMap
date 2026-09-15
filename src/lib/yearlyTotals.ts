// Plain calendar-year grouping (Jan–Dec) — unlike Income & Tax, purchases
// and car expenses have no Australian-financial-year concept to respect,
// so this doesn't take a currency/isAustralian flag the way
// financeTotals.ts's financialYearLabel does.

export interface YearTotal {
  year: number;
  total: number;
  count: number;
}

/** Totals grouped by calendar year, newest year first. */
export function groupByYear<T>(items: T[], getDate: (item: T) => string, getAmount: (item: T) => number): YearTotal[] {
  const byYear = new Map<number, YearTotal>();
  for (const item of items) {
    const year = new Date(getDate(item)).getFullYear();
    const existing = byYear.get(year);
    if (existing) {
      existing.total += getAmount(item);
      existing.count += 1;
    } else {
      byYear.set(year, { year, total: getAmount(item), count: 1 });
    }
  }
  return [...byYear.values()].sort((a, b) => b.year - a.year);
}

/** A generic ranked total — reused for both "by year" and "by category"
 *  breakdowns, which are the same shape (a label and a sum) either way. */
export interface RankedTotal {
  label: string;
  total: number;
}

export function groupByLabel<T>(items: T[], getLabel: (item: T) => string, getAmount: (item: T) => number): RankedTotal[] {
  const byLabel = new Map<string, number>();
  for (const item of items) {
    const label = getLabel(item);
    byLabel.set(label, (byLabel.get(label) ?? 0) + getAmount(item));
  }
  return [...byLabel.entries()].map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total);
}
