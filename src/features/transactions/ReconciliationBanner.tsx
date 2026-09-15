import { useMemo } from 'react';
import { CreditCard } from 'lucide-react';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useToastStore } from '../../store/useToastStore';

/** A quiet summary of every expense currently flagged "moved to credit
 *  card" — money that'll land on a statement you haven't reconciled yet —
 *  with a one-tap way to clear the flag on all of them once you have.
 *  Nothing to show (and nothing rendered) once there's nothing pending. */
export function ReconciliationBanner({ onViewMoved }: { onViewMoved: () => void }) {
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const showToast = useToastStore((s) => s.show);

  const moved = useMemo(() => transactions.filter((t) => t.movedToCreditCard), [transactions]);
  const total = moved.reduce((sum, t) => sum + t.amount, 0);

  if (moved.length === 0) return null;

  function clearAll() {
    const snapshot = moved;
    for (const t of snapshot) updateTransaction({ ...t, movedToCreditCard: false });
    showToast(`Cleared ${snapshot.length} expense${snapshot.length === 1 ? '' : 's'} from reconciliation`, {
      actionLabel: 'Undo',
      onAction: () => {
        for (const t of snapshot) updateTransaction({ ...t, movedToCreditCard: true });
      },
    });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-panel px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm text-ink-bright">
        <CreditCard size={15} className="text-ink-muted" />
        <span>
          <span className="figure-sans font-semibold">{formatCurrency(total, currency)}</span> across {moved.length}{' '}
          {moved.length === 1 ? 'expense' : 'expenses'} awaiting reconciliation
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs font-medium">
        <button onClick={onViewMoved} className="text-ink-muted hover:text-ink-bright">
          View only these
        </button>
        <button onClick={clearAll} className="text-amber hover:text-amber/80">
          Clear all
        </button>
      </div>
    </div>
  );
}
