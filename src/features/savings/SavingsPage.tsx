import { useState } from 'react';
import { PiggyBank, Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useFinanceStore } from '../../store/useFinanceStore';
import type { SavingsGoal } from '../../lib/types';
import { SavingsGoalCard } from './SavingsGoalCard';
import { SavingsGoalForm } from './SavingsGoalForm';

export function SavingsPage() {
  const goals = useFinanceStore((s) => s.savingsGoals);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | undefined>(undefined);

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

      <div className="flex flex-col gap-3 px-5 py-6 sm:px-8">
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
