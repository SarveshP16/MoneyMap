import { motion } from 'framer-motion';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { useFinanceStore } from '../../store/useFinanceStore';

export interface RankedBarRow {
  /** Stable identifier for selection — distinct from `label` so a display
   *  name (e.g. "Rego") can map back to an underlying value (e.g. the enum
   *  `rego`) the caller actually filters on. Defaults to `label` when the
   *  two are the same thing (a year, say). */
  key: string;
  label: string;
  total: number;
}

/** A single-hue magnitude bar list — same form as Overview's "Top
 *  categories": each row already names itself, so no legend or
 *  categorical palette is needed, just direct labels and comparable bar
 *  lengths. Reused here for "by year" and "by category" breakdowns, which
 *  are the same shape either way.
 *
 *  Pass `onSelect` to make rows double as filter chips: the active row
 *  (`selectedKey`) is highlighted and the rest dim slightly, so picking one
 *  reads as narrowing the view rather than just as a hover state. */
export function RankedBars({
  rows,
  selectedKey,
  onSelect,
}: {
  rows: RankedBarRow[];
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
}) {
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const max = rows[0]?.total ?? 0;

  if (rows.length === 0) {
    return <p className="text-xs text-ink-faint">No data for this filter.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => {
        const isSelected = selectedKey === r.key;
        const isDimmed = selectedKey != null && !isSelected;

        return (
          <motion.button
            key={r.key}
            type="button"
            layout
            disabled={!onSelect}
            onClick={() => onSelect?.(r.key)}
            animate={{ opacity: isDimmed ? 0.5 : 1 }}
            className={`-mx-1 rounded-lg px-1 py-0.5 text-left transition-colors ${
              onSelect ? 'cursor-pointer hover:opacity-100' : 'cursor-default'
            }`}
          >
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className={isSelected ? 'font-medium text-amber' : 'text-ink-bright'}>{r.label}</span>
              <span className="figure-sans shrink-0 text-ink-muted">{formatCurrency(r.total, currency)}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-ink-soft">
              <motion.div
                className={`h-full rounded-full ${isSelected ? 'bg-amber' : 'bg-amber/70'}`}
                initial={{ width: 0 }}
                animate={{ width: max > 0 ? `${(r.total / max) * 100}%` : '0%' }}
                transition={{ type: 'spring', stiffness: 120, damping: 22 }}
              />
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
