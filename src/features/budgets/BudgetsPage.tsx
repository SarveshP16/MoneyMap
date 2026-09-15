import { useState } from 'react';
import { PieChart, Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useFinanceStore } from '../../store/useFinanceStore';
import { spentInCurrentPeriod } from '../../lib/budgetCalculations';
import type { Category } from '../../lib/types';
import { CategoryCard } from './CategoryCard';
import { CategoryForm } from './CategoryForm';
import { PaymentMethodsSection } from './PaymentMethodsSection';
import { PaymentMethodForm } from './PaymentMethodForm';

export function BudgetsPage() {
  const categories = useFinanceStore((s) => s.categories);
  const transactions = useFinanceStore((s) => s.transactions);

  const [formOpen, setFormOpen] = useState(false);
  const [methodFormOpen, setMethodFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | undefined>(undefined);

  const today = new Date();

  return (
    <div>
      <PageHeader
        title="Budgets"
        subtitle="Category spending limits"
        actions={
          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            Add category
          </Button>
        }
      />

      <div className="flex flex-col gap-3 px-5 py-6 sm:px-8">
        {categories.length === 0 ? (
          <EmptyState
            icon={PieChart}
            title="No categories yet"
            description="Add a category to start budgeting."
            action={
              <Button variant="outline" onClick={() => setFormOpen(true)}>
                Add a category
              </Button>
            }
          />
        ) : (
          categories.map((c) => (
            <CategoryCard
              key={c.id}
              category={c}
              spent={spentInCurrentPeriod(transactions, c, today)}
              onClick={() => {
                setEditing(c);
                setFormOpen(true);
              }}
            />
          ))
        )}

        <PaymentMethodsSection onAdd={() => setMethodFormOpen(true)} />
      </div>

      <CategoryForm key={editing?.id ?? 'new'} open={formOpen} onClose={() => setFormOpen(false)} category={editing} />
      <PaymentMethodForm open={methodFormOpen} onClose={() => setMethodFormOpen(false)} />
    </div>
  );
}
