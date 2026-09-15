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
 *  breakdowns, which are the same shape (a key, a label and a sum) either
 *  way. `key` is what a filter compares against (a category's enum value,
 *  say); `label` is what's shown — they're the same string unless the
 *  caller passes `getKey` to tell them apart. */
export interface RankedTotal {
  key: string;
  label: string;
  total: number;
}

export function groupByLabel<T>(
  items: T[],
  getLabel: (item: T) => string,
  getAmount: (item: T) => number,
  getKey: (item: T) => string = getLabel,
): RankedTotal[] {
  const byKey = new Map<string, RankedTotal>();
  for (const item of items) {
    const key = getKey(item);
    const existing = byKey.get(key);
    if (existing) {
      existing.total += getAmount(item);
    } else {
      byKey.set(key, { key, label: getLabel(item), total: getAmount(item) });
    }
  }
  return [...byKey.values()].sort((a, b) => b.total - a.total);
}
