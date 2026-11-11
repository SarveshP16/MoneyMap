import { motion } from 'framer-motion';
import { EditHint } from '../../components/ui/EditHint';
import { Trail } from '../../components/ui/Trail';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { budgetPeriodLabel, type Category } from '../../lib/types';
import { periodRange, type BudgetStatus } from '../../lib/budgetCalculations';
import { formatDayRange } from '../../lib/dates';
import { useFinanceStore } from '../../store/useFinanceStore';

export function CategoryCard({
  category,
  status,
  onClick,
}: {
  category: Category;
  status: BudgetStatus;
  onClick: () => void;
}) {
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const { spent, base, budget, carriedIn, debt } = status;
  const isOverBudget = budget != null && (spent > budget || debt > 0);
  // In debt the budget is 0, so there's no ratio to show — the bar sits full in coral.
  const progress = budget == null ? null : budget > 0 ? spent / budget : debt > 0 ? 1 : null;
  const current = periodRange(category, new Date());

  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      whileHover={{ y: -2 }}
      className="ledger-tab flex w-full flex-col gap-2.5 rounded-xl border border-line bg-panel p-4 text-left transition-colors hover:border-verdigris/30"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink-bright">{category.name}</span>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className={`figure-sans text-sm ${isOverBudget ? 'font-semibold text-coral' : 'text-ink-muted'}`}>
            {budget != null
              ? `${formatCurrency(spent, currency)} / ${formatCurrency(budget, currency)}`
              : formatCurrency(spent, currency)}
          </span>
          <EditHint />
        </div>
      </div>
      {budget != null ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="w-fit rounded-full bg-brass-soft px-2 py-0.5 text-xs font-medium text-brass">
            {budgetPeriodLabel[category.period]} budget
          </span>
          <span className="text-xs text-ink-faint">{formatDayRange(current.start, current.end)}</span>
        </div>
      ) : (
        <p className="text-xs text-ink-faint">No budget set</p>
      )}
      {debt > 0 ? (
        <p className="figure-sans text-xs font-medium text-coral">
          {formatCurrency(debt, currency)} in debt, carried to the next period
        </p>
      ) : (
        carriedIn !== 0 &&
        base != null && (
          <p className="figure-sans text-xs text-ink-muted">
            {formatCurrency(base, currency)} {carriedIn > 0 ? '+' : '−'} {formatCurrency(Math.abs(carriedIn), currency)}{' '}
            from last period
          </p>
        )
      )}
      {progress != null && <Trail progress={progress} tone={isOverBudget ? 'coral' : 'verdigris'} />}
    </motion.button>
  );
}
