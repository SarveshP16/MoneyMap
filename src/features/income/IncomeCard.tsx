import { motion } from 'framer-motion';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { formatIsoDate } from '../../lib/dates';
import { financialYearLabel } from '../../lib/financeTotals';
import { incomeTypeLabel, type IncomeRecord } from '../../lib/types';
import { useFinanceStore } from '../../store/useFinanceStore';

export function IncomeCard({ record, onClick }: { record: IncomeRecord; onClick: () => void }) {
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const date = new Date(record.dateReceived);

  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      whileHover={{ y: -2 }}
      className="flex w-full items-start justify-between gap-3 rounded-xl border border-line bg-panel p-4 text-left transition-colors hover:border-amber/30"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-bright">{record.sourceName}</p>
        <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-ink-muted">
          <span>{formatIsoDate(date)}</span>
          <span>· {financialYearLabel(date, currency.isAustralian)}</span>
          {record.incomeType && <span>· {incomeTypeLabel[record.incomeType]}</span>}
        </div>
        {record.taxWithheld != null && (
          <p className="mt-1 text-xs text-ink-faint">Tax withheld: {formatCurrency(record.taxWithheld, currency)}</p>
        )}
      </div>
      <p className="figure-sans shrink-0 text-sm font-semibold text-ink-bright">{formatCurrency(record.grossAmount, currency)}</p>
    </motion.button>
  );
}
