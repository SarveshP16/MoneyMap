import { motion } from 'framer-motion';
import { PieChart } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { currencyOf, formatCurrency } from '../../lib/currency';
import type { Category, Transaction } from '../../lib/types';
import { useFinanceStore } from '../../store/useFinanceStore';

/** Spend-by-category, ranked — a single-hue magnitude bar list rather than
 *  a pie: each row is already directly labeled with its category name, so
 *  there's no identity a legend or multi-hue palette would need to carry,
 *  and bar length compares much more precisely than a wedge angle would. */
export function TopCategories({ transactions, categories }: { transactions: Transaction[]; categories: Category[] }) {
  const currency = useFinanceStore((s) => currencyOf(s.currency));

  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (!t.categoryId) continue;
    totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
  }
  const ranked = [...totals.entries()]
    .map(([categoryId, amount]) => ({ category: categories.find((c) => c.id === categoryId), amount }))
    .filter((r) => r.category)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6) as { category: Category; amount: number }[];

  const max = ranked[0]?.amount ?? 0;

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <h2 className="mb-3 font-display text-lg font-semibold text-ink-bright">Top categories</h2>
      {ranked.length === 0 ? (
        <EmptyState icon={PieChart} title="Nothing categorized yet" description="Tag an expense with a category to see it ranked here." />
      ) : (
        <div className="flex flex-col gap-3">
          {ranked.map((r) => (
            <div key={r.category.id}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-ink-bright">{r.category.name}</span>
                <span className="figure-sans shrink-0 text-ink-muted">{formatCurrency(r.amount, currency)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-ink-soft">
                <motion.div
                  className="h-full rounded-full bg-amber"
                  initial={{ width: 0 }}
                  animate={{ width: max > 0 ? `${(r.amount / max) * 100}%` : '0%' }}
                  transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
