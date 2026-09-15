import { useMemo, useState } from 'react';
import { CheckCheck, HandCoins } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useFinanceStore } from '../../store/useFinanceStore';
import { currencyOf, formatCurrency } from '../../lib/currency';
import type { Transaction } from '../../lib/types';
import { TransactionRow } from './TransactionRow';
import { TransactionForm } from './TransactionForm';

interface OwedGroup {
  name: string;
  total: number;
  transactions: Transaction[];
}

/** Every outstanding split, grouped by who owes it — a running ledger of
 *  "who owes me what" instead of filtering Transactions one name at a
 *  time. A transaction with a split but no name typed goes under
 *  "Unspecified" rather than being dropped. */
function groupOwed(transactions: Transaction[]): OwedGroup[] {
  const groups = new Map<string, OwedGroup>();
  for (const t of transactions) {
    if (t.splitAmount == null || t.splitPaidBack) continue;
    const name = t.splitOwedByName?.trim() || 'Unspecified';
    const group = groups.get(name) ?? { name, total: 0, transactions: [] };
    group.total += t.splitAmount;
    group.transactions.push(t);
    groups.set(name, group);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total);
}

export function OwedToYouPage() {
  const transactions = useFinanceStore((s) => s.transactions);
  const categories = useFinanceStore((s) => s.categories);
  const paymentMethods = useFinanceStore((s) => s.paymentMethods);
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);

  const [editing, setEditing] = useState<Transaction | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);

  const groups = useMemo(() => groupOwed(transactions), [transactions]);
  const grandTotal = groups.reduce((s, g) => s + g.total, 0);

  function markAllPaid(group: OwedGroup) {
    for (const t of group.transactions) {
      updateTransaction({ ...t, splitPaidBack: true });
    }
  }

  return (
    <div>
      <PageHeader
        title="Owed to you"
        subtitle={groups.length > 0 ? `${formatCurrency(grandTotal, currency)} outstanding across ${groups.length} ${groups.length === 1 ? 'person' : 'people'}` : 'Split expenses still waiting to be paid back'}
      />

      <div className="flex flex-col gap-5 px-5 py-6 sm:px-8">
        {groups.length === 0 ? (
          <EmptyState
            icon={CheckCheck}
            title="All settled up"
            description="Nobody currently owes you anything — split an expense to start tracking it."
          />
        ) : (
          groups.map((group) => (
            <div key={group.name} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <HandCoins size={16} className="text-emerald" />
                  <h2 className="text-sm font-semibold text-ink-bright">{group.name}</h2>
                  <span className="figure-sans text-sm text-emerald">{formatCurrency(group.total, currency)}</span>
                </div>
                <button
                  onClick={() => markAllPaid(group)}
                  className="text-xs font-medium text-amber hover:text-amber/80"
                >
                  Mark all as paid
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {group.transactions.map((t) => (
                  <TransactionRow
                    key={t.id}
                    transaction={t}
                    categoryName={categories.find((c) => c.id === t.categoryId)?.name}
                    paymentMethodName={paymentMethods.find((m) => m.id === t.paymentMethodId)?.name}
                    onClick={() => {
                      setEditing(t);
                      setFormOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <TransactionForm key={editing?.id ?? 'new'} open={formOpen} onClose={() => setFormOpen(false)} transaction={editing} />
    </div>
  );
}
