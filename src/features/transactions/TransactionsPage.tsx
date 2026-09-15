import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, Receipt, Search, SlidersHorizontal } from 'lucide-react';
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
import { ReconciliationBanner } from './ReconciliationBanner';

export function TransactionsPage() {
  const transactions = useFinanceStore((s) => s.transactions);
  const categories = useFinanceStore((s) => s.categories);
  const paymentMethods = useFinanceStore((s) => s.paymentMethods);
  const filter = useFinanceStore((s) => s.filter);
  const applyFilter = useFinanceStore((s) => s.applyFilter);
  const currency = useFinanceStore((s) => currencyOf(s.currency));

  const filtered = useMemo(() => applyTransactionFilter(transactions, filter), [transactions, filter]);
  const filterActive = isFilterActive(filter);

  const [formOpen, setFormOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>(undefined);
  const [query, setQuery] = useState('');

  // Free-text search narrows whatever the filter already produced — name,
  // note, "owed by", category, and payment method all match. Kept as
  // page-local state rather than part of TransactionFilter: it's a
  // type-as-you-go interaction, not an apply/clear one.
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((t) => {
      const categoryName = categories.find((c) => c.id === t.categoryId)?.name ?? '';
      const methodName = paymentMethods.find((m) => m.id === t.paymentMethodId)?.name ?? '';
      return [t.name, t.note, t.splitOwedByName, categoryName, methodName].some((field) =>
        field?.toLowerCase().includes(q),
      );
    });
  }, [filtered, query, categories, paymentMethods]);

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
        subtitle={`${searched.length} expense${searched.length === 1 ? '' : 's'} · ${formatCurrency(totalSpent(searched), currency)}`}
        actions={
          <>
            <IconButton onClick={() => setFilterOpen(true)} className={filterActive ? 'text-verdigris' : undefined} aria-label="Filter">
              <SlidersHorizontal size={18} />
            </IconButton>
            <Button icon={<Plus size={16} />} onClick={openNew}>
              Add expense
            </Button>
          </>
        }
      />

      <div className="px-5 py-6 sm:px-8">
        <ReconciliationBanner onViewMoved={() => applyFilter({ ...filter, movedToCreditCard: true })} />

        {transactions.length > 0 && (
          <div className="relative mb-4">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search expenses…"
              className="w-full rounded-lg border border-line bg-ink-soft py-2.5 pl-9 pr-3 text-sm text-ink-bright placeholder:text-ink-faint outline-none transition-colors focus:border-verdigris"
            />
          </div>
        )}

        {filterActive && (
          <div className="mb-4 rounded-lg border border-verdigris/30 bg-verdigris-soft/40 px-4 py-2 text-sm text-ink-bright">
            Filter active — showing {filtered.length} of {transactions.length} expenses.
          </div>
        )}

        {searched.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={query ? 'No expenses match your search' : filterActive ? 'No expenses match this filter' : 'No expenses yet'}
            description={
              query
                ? 'Try a different name, note, category, or payment method.'
                : filterActive
                  ? 'Try widening the date range or clearing a filter.'
                  : 'Add your first expense to start tracking where your money goes.'
            }
            action={
              !filterActive &&
              !query && (
                <Button variant="outline" onClick={openNew}>
                  Add an expense
                </Button>
              )
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            <AnimatePresence>
              {searched.map((t) => (
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
