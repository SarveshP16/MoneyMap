import { motion } from 'framer-motion';
import { CheckCircle2, CreditCard, Trash2 } from 'lucide-react';
import { EditHint } from '../../components/ui/EditHint';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { formatRelativeDate } from '../../lib/dates';
import type { Transaction } from '../../lib/types';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useToastStore } from '../../store/useToastStore';

export function TransactionRow({
  transaction,
  categoryName,
  paymentMethodName,
  onClick,
}: {
  transaction: Transaction;
  categoryName?: string;
  paymentMethodName?: string;
  onClick: () => void;
}) {
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const restoreTransaction = useFinanceStore((s) => s.restoreTransaction);
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const showToast = useToastStore((s) => s.show);

  const title = transaction.name?.trim() ? transaction.name : categoryName ?? 'Expense';

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    deleteTransaction(transaction.id);
    showToast(`Deleted "${title}"`, { actionLabel: 'Undo', onAction: () => restoreTransaction(transaction) });
  }

  function toggleMovedToCard(e: React.MouseEvent) {
    e.stopPropagation();
    updateTransaction({ ...transaction, movedToCreditCard: !transaction.movedToCreditCard });
  }

  function toggleSplitPaidBack(e: React.MouseEvent) {
    e.stopPropagation();
    updateTransaction({ ...transaction, splitPaidBack: !transaction.splitPaidBack });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
      onClick={onClick}
      className="ledger-tab group flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-panel p-3.5 transition-colors hover:border-verdigris/30"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-bright">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
          <span>{formatRelativeDate(new Date(transaction.date))}</span>
          {categoryName && <span>· {categoryName}</span>}
          {paymentMethodName && <span>· {paymentMethodName}</span>}
          <button
            onClick={toggleMovedToCard}
            title={transaction.movedToCreditCard ? 'Tap to unmark as moved to credit card' : 'Mark as moved to credit card'}
            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 transition-colors ${
              transaction.movedToCreditCard ? 'bg-emerald-soft text-emerald' : 'text-ink-faint hover:text-ink-muted'
            }`}
          >
            <CreditCard size={12} />
            {transaction.movedToCreditCard && <span className="text-[10px] font-semibold">Moved</span>}
          </button>
        </div>
        {transaction.splitAmount != null && (
          <button
            onClick={toggleSplitPaidBack}
            className={`mt-1.5 inline-flex items-center gap-1 text-xs ${
              transaction.splitPaidBack ? 'text-ink-faint' : 'text-emerald'
            }`}
          >
            <CheckCircle2 size={13} />
            {transaction.splitPaidBack
              ? 'Paid back'
              : `${formatCurrency(transaction.splitAmount, currency)} owed to you${
                  transaction.splitOwedByName ? ` by ${transaction.splitOwedByName}` : ''
                }`}
          </button>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="figure-sans text-sm font-semibold text-ink-bright">
          {formatCurrency(transaction.amount, currency)}
        </span>
        <EditHint />
        <button
          onClick={handleDelete}
          className="rounded-md p-1.5 text-ink-faint opacity-0 transition-opacity hover:bg-coral-soft hover:text-coral group-hover:opacity-100"
          aria-label="Delete expense"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </motion.div>
  );
}
