import { motion } from 'framer-motion';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { useFinanceStore } from '../../store/useFinanceStore';

/** A single-hue magnitude bar list — same form as Overview's "Top
 *  categories": each row already names itself, so no legend or
 *  categorical palette is needed, just direct labels and comparable bar
 *  lengths. Reused here for "by year" and "by category" breakdowns, which
 *  are the same shape either way. */
export function RankedBars({ rows }: { rows: { label: string; total: number }[] }) {
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const max = rows[0]?.total ?? 0;

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink-bright">{r.label}</span>
            <span className="figure-sans shrink-0 text-ink-muted">{formatCurrency(r.total, currency)}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-ink-soft">
            <motion.div
              className="h-full rounded-full bg-amber"
              initial={{ width: 0 }}
              animate={{ width: max > 0 ? `${(r.total / max) * 100}%` : '0%' }}
              transition={{ type: 'spring', stiffness: 120, damping: 22 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
