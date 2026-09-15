import { motion } from 'framer-motion';
import { Trail } from '../../components/ui/Trail';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { budgetPeriodLabel, type Category } from '../../lib/types';
import { useFinanceStore } from '../../store/useFinanceStore';

export function CategoryCard({
  category,
  spent,
  onClick,
}: {
  category: Category;
  spent: number;
  onClick: () => void;
}) {
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const budget = category.budgetAmount;
  const isOverBudget = budget != null && spent > budget;
  const progress = budget == null || budget <= 0 ? null : spent / budget;

  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      whileHover={{ y: -2 }}
      className="flex w-full flex-col gap-2.5 rounded-xl border border-line bg-panel p-4 text-left transition-colors hover:border-amber/30"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink-bright">{category.name}</span>
        <span className={`figure-sans text-sm ${isOverBudget ? 'font-semibold text-coral' : 'text-ink-muted'}`}>
          {budget != null
            ? `${formatCurrency(spent, currency)} / ${formatCurrency(budget, currency)}`
            : formatCurrency(spent, currency)}
        </span>
      </div>
      <p className="text-xs text-ink-faint">{budget != null ? `${budgetPeriodLabel[category.period]} budget` : 'No budget set'}</p>
      {progress != null && <Trail progress={progress} tone={isOverBudget ? 'coral' : 'amber'} />}
    </motion.button>
  );
}
