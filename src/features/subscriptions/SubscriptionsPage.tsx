import { useState } from 'react';
import { CalendarClock, Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useFinanceStore } from '../../store/useFinanceStore';
import { monthlyTotal } from '../../lib/financeTotals';
import { currencyOf, formatCurrency } from '../../lib/currency';
import type { Subscription, SubscriptionKind } from '../../lib/types';
import { SubscriptionCard } from './SubscriptionCard';
import { SubscriptionForm } from './SubscriptionForm';
import { UpcomingBills } from './UpcomingBills';

function Section({
  title,
  items,
  currency,
  onSelect,
}: {
  title: string;
  items: Subscription[];
  currency: ReturnType<typeof currencyOf>;
  onSelect: (s: Subscription) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-bright">{title}</h2>
        <span className="figure-sans text-sm text-ink-muted">{formatCurrency(monthlyTotal(items), currency)}/mo</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((s) => (
          <SubscriptionCard key={s.id} subscription={s} onClick={() => onSelect(s)} />
        ))}
      </div>
    </div>
  );
}

export function SubscriptionsPage() {
  const items = useFinanceStore((s) => s.subscriptions);
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | undefined>(undefined);
  const [initialKind, setInitialKind] = useState<SubscriptionKind>('subscription');

  const subscriptions = items.filter((s) => s.kind === 'subscription');
  const bills = items.filter((s) => s.kind === 'bill');

  function openNew(kind: SubscriptionKind) {
    setEditing(undefined);
    setInitialKind(kind);
    setFormOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Subscriptions & bills"
        subtitle={items.length > 0 ? `${formatCurrency(monthlyTotal(items), currency)}/mo combined` : 'Recurring costs, normalised to monthly'}
        actions={
          <Button icon={<Plus size={16} />} onClick={() => openNew('subscription')}>
            Add
          </Button>
        }
      />

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        {items.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing tracked yet"
            description="Add a subscription or bill to see its monthly cost."
            action={
              <Button variant="outline" onClick={() => openNew('subscription')}>
                Add subscription or bill
              </Button>
            }
          />
        ) : (
          <>
            <UpcomingBills />
            <Section
              title="Subscriptions"
              items={subscriptions}
              currency={currency}
              onSelect={(s) => {
                setEditing(s);
                setFormOpen(true);
              }}
            />
            <Section
              title="Bills"
              items={bills}
              currency={currency}
              onSelect={(s) => {
                setEditing(s);
                setFormOpen(true);
              }}
            />
          </>
        )}
      </div>

      <SubscriptionForm
        key={editing?.id ?? `new-${initialKind}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        subscription={editing}
        initialKind={initialKind}
      />
    </div>
  );
}
