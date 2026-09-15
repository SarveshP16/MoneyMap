import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, Receipt, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button, IconButton } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useFinanceStore } from '../../store/useFinanceStore';
import { applyTransactionFilter, isFilterActive } from '../../lib/transactionFiltering';
import { totalSpent } from '../../lib/financeTotals';
import { currencyOf, formatCurrency } from '../../lib/currency';
import type { Transaction } from '../../lib/types';
import { TransactionRow } from './TransactionRow';
import { TransactionForm } from './TransactionForm';
import { TransactionFilterPanel } from './TransactionFilterPanel';

export function TransactionsPage() {
  const transactions = useFinanceStore((s) => s.transactions);
  const categories = useFinanceStore((s) => s.categories);
  const paymentMethods = useFinanceStore((s) => s.paymentMethods);
  const filter = useFinanceStore((s) => s.filter);
  const currency = useFinanceStore((s) => currencyOf(s.currency));

  const filtered = useMemo(() => applyTransactionFilter(transactions, filter), [transactions, filter]);
  const filterActive = isFilterActive(filter);

  const [formOpen, setFormOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>(undefined);

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setFormOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle={`${filtered.length} expense${filtered.length === 1 ? '' : 's'} · ${formatCurrency(totalSpent(filtered), currency)}`}
        actions={
          <>
            <IconButton onClick={() => setFilterOpen(true)} className={filterActive ? 'text-amber' : undefined} aria-label="Filter">
              <SlidersHorizontal size={18} />
            </IconButton>
            <Button icon={<Plus size={16} />} onClick={openNew}>
              Add expense
            </Button>
          </>
        }
      />

      <div className="px-5 py-6 sm:px-8">
        {filterActive && (
          <div className="mb-4 rounded-lg border border-amber/30 bg-amber-soft/40 px-4 py-2 text-sm text-ink-bright">
            Filter active — showing {filtered.length} of {transactions.length} expenses.
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={filterActive ? 'No expenses match this filter' : 'No expenses yet'}
            description={
              filterActive
                ? 'Try widening the date range or clearing a filter.'
                : 'Add your first expense to start tracking where your money goes.'
            }
            action={
              !filterActive && (
                <Button variant="outline" onClick={openNew}>
                  Add an expense
                </Button>
              )
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {filtered.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  categoryName={categories.find((c) => c.id === t.categoryId)?.name}
                  paymentMethodName={paymentMethods.find((m) => m.id === t.paymentMethodId)?.name}
                  onClick={() => openEdit(t)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <TransactionForm key={editing?.id ?? 'new'} open={formOpen} onClose={() => setFormOpen(false)} transaction={editing} />
      <TransactionFilterPanel open={filterOpen} onClose={() => setFilterOpen(false)} />
    </div>
  );
}
