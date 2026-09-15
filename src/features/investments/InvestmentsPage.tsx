import { useState } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useFinanceStore } from '../../store/useFinanceStore';
import { totalInvestmentsValue } from '../../lib/financeTotals';
import { currencyOf, formatCurrency } from '../../lib/currency';
import type { Investment } from '../../lib/types';
import { InvestmentCard } from './InvestmentCard';
import { InvestmentForm } from './InvestmentForm';

export function InvestmentsPage() {
  const investments = useFinanceStore((s) => s.investments);
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | undefined>(undefined);

  return (
    <div>
      <PageHeader
        title="Investments"
        subtitle={investments.length > 0 ? `Holdings worth ${formatCurrency(totalInvestmentsValue(investments), currency)}` : 'Holdings and their current value'}
        actions={
          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            Add investment
          </Button>
        }
      />

      <div className="flex flex-col gap-3 px-5 py-6 sm:px-8">
        {investments.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No investments yet"
            description="Track a holding's value manually — stocks, ETFs, crypto, super, property, anything."
            action={
              <Button variant="outline" onClick={() => setFormOpen(true)}>
                Add an investment
              </Button>
            }
          />
        ) : (
          investments.map((i) => (
            <InvestmentCard
              key={i.id}
              investment={i}
              onClick={() => {
                setEditing(i);
                setFormOpen(true);
              }}
            />
          ))
        )}
      </div>

      <InvestmentForm key={editing?.id ?? 'new'} open={formOpen} onClose={() => setFormOpen(false)} investment={editing} />
    </div>
  );
}
