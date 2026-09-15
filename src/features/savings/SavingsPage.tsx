import { useMemo, useState } from 'react';
import { Landmark, PiggyBank, Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatTile } from '../../components/ui/StatTile';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { useFinanceStore } from '../../store/useFinanceStore';
import type { SavingsGoal } from '../../lib/types';
import { SavingsGoalCard } from './SavingsGoalCard';
import { SavingsGoalForm } from './SavingsGoalForm';

export function SavingsPage() {
  const goals = useFinanceStore((s) => s.savingsGoals);
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | undefined>(undefined);

  // What's actually sitting in each bank right now — currentAmount summed
  // per bankAccount, not targetAmount, since this answers "how much do I
  // have at MQ" rather than "how much am I aiming for". Goals without a
  // bank set still count, under one shared bucket, so nothing saved gets
  // silently left out of the total.
  const totalsByBank = useMemo(() => {
    const totals = new Map<string, number>();
    for (const g of goals) {
      const key = g.bankAccount?.trim() || 'No bank set';
      totals.set(key, (totals.get(key) ?? 0) + g.currentAmount);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [goals]);

  return (
    <div>
      <PageHeader
        title="Savings"
        subtitle="Targets you're saving toward"
        actions={
          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            Add goal
          </Button>
        }
      />

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        {totalsByBank.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-medium text-ink-muted">By bank</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {totalsByBank.map(([bank, total]) => (
                <StatTile key={bank} icon={Landmark} label={bank} value={total} format={(n) => formatCurrency(n, currency)} />
              ))}
            </div>
          </div>
        )}

        {goals.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="No savings goals yet"
            description="Add a goal to start tracking your progress toward it."
            action={
              <Button variant="outline" onClick={() => setFormOpen(true)}>
                Add a goal
              </Button>
            }
          />
        ) : (
          goals.map((g) => (
            <SavingsGoalCard
              key={g.id}
              goal={g}
              onClick={() => {
                setEditing(g);
                setFormOpen(true);
              }}
            />
          ))
        )}
      </div>

      <SavingsGoalForm key={editing?.id ?? 'new'} open={formOpen} onClose={() => setFormOpen(false)} goal={editing} />
    </div>
  );
}
