import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { budgetWarnings } from '../../lib/alerts';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { useFinanceStore } from '../../store/useFinanceStore';

/** Categories at or over budget for their current period — renders
 *  nothing when everything's under, so it never adds empty chrome to a
 *  page that's fine. Severity ('over' vs the 80%-and-climbing 'near')
 *  reuses the same coral/brass split the rest of the app already gives
 *  those meanings, rather than inventing a third color for "warning". */
export function BudgetAlerts() {
  const categories = useFinanceStore((s) => s.categories);
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const navigate = useNavigate();

  const warnings = budgetWarnings(categories, transactions, new Date());
  if (warnings.length === 0) return null;

  return (
    <div className="ledger-tab rounded-xl border border-coral-soft bg-coral-soft/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={15} className="text-coral" />
        <h2 className="font-display text-lg font-semibold text-ink-bright">Budget alerts</h2>
      </div>
      <div className="flex flex-col gap-2">
        {warnings.map((w) => (
          <button
            key={w.category.id}
            type="button"
            onClick={() => navigate('/budgets')}
            className="flex items-center justify-between gap-3 rounded-lg bg-ink-soft px-3 py-2.5 text-left transition-colors hover:bg-panel-high"
          >
            <span className="text-sm font-medium text-ink-bright">{w.category.name}</span>
            <span className={`figure-sans shrink-0 text-xs font-semibold ${w.severity === 'over' ? 'text-coral' : 'text-brass'}`}>
              {formatCurrency(w.spent, currency)} / {formatCurrency(w.budget, currency)} · {Math.round(w.ratio * 100)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
