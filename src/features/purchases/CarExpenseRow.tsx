import { motion } from 'framer-motion';
import { EditHint } from '../../components/ui/EditHint';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { formatIsoDate } from '../../lib/dates';
import { carExpenseCategoryLabel, type CarExpense } from '../../lib/types';
import { useFinanceStore } from '../../store/useFinanceStore';

export function CarExpenseRow({ carExpense, onClick }: { carExpense: CarExpense; onClick: () => void }) {
  const currency = useFinanceStore((s) => currencyOf(s.currency));

  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      whileHover={{ y: -2 }}
      className="ledger-tab flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-panel p-4 text-left transition-colors hover:border-verdigris/30"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-bright">{carExpense.name}</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          {formatIsoDate(new Date(carExpense.date))} · {carExpenseCategoryLabel[carExpense.category]}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <p className="figure-sans text-sm font-semibold text-ink-bright">{formatCurrency(carExpense.amount, currency)}</p>
        <EditHint />
      </div>
    </motion.button>
  );
}
