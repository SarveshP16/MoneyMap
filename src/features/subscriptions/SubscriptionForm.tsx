import { useState } from 'react';
import { AmountInput, DateInput, Field, Segmented, TextInput } from '../../components/ui/fields';
import { Button } from '../../components/ui/Button';
import { FormDrawer } from '../../components/ui/FormDrawer';
import { formatIsoDate, parseIsoDateLocal } from '../../lib/dates';
import {
  BILLING_CYCLES,
  billingCycleLabel,
  subscriptionKindLabel,
  type BillingCycle,
  type Subscription,
  type SubscriptionKind,
} from '../../lib/types';
import { currencyOf } from '../../lib/currency';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useToastStore } from '../../store/useToastStore';

const KINDS: SubscriptionKind[] = ['subscription', 'bill'];

export function SubscriptionForm({
  open,
  onClose,
  subscription,
  initialKind = 'subscription',
}: {
  open: boolean;
  onClose: () => void;
  subscription?: Subscription;
  initialKind?: SubscriptionKind;
}) {
  const isEditing = subscription != null;
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const addSubscription = useFinanceStore((s) => s.addSubscription);
  const updateSubscription = useFinanceStore((s) => s.updateSubscription);
  const deleteSubscription = useFinanceStore((s) => s.deleteSubscription);
  const restoreSubscription = useFinanceStore((s) => s.restoreSubscription);
  const showToast = useToastStore((s) => s.show);

  const [kind, setKind] = useState<SubscriptionKind>(subscription?.kind ?? initialKind);
  const [name, setName] = useState(subscription?.name ?? '');
  const [amount, setAmount] = useState(subscription?.amount.toString() ?? '');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(subscription?.billingCycle ?? 'monthly');
  const [startDate, setStartDate] = useState(subscription?.startDate ? formatIsoDate(new Date(subscription.startDate)) : '');
  const [endDate, setEndDate] = useState(subscription?.endDate ? formatIsoDate(new Date(subscription.endDate)) : '');

  function save() {
    const amountNum = Number.parseFloat(amount);
    if (!name.trim() || !Number.isFinite(amountNum) || amountNum <= 0) return;

    const base = {
      name: name.trim(),
      amount: amountNum,
      billingCycle,
      kind,
      startDate: startDate ? parseIsoDateLocal(startDate).toISOString() : undefined,
      endDate: endDate ? parseIsoDateLocal(endDate).toISOString() : undefined,
    };

    if (isEditing) {
      updateSubscription({ ...subscription, ...base });
    } else {
      addSubscription(base);
    }
    onClose();
  }

  function remove() {
    if (!subscription) return;
    deleteSubscription(subscription.id);
    showToast(`Deleted "${subscription.name}"`, { actionLabel: 'Undo', onAction: () => restoreSubscription(subscription) });
    onClose();
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEditing ? `Edit ${subscriptionKindLabel[kind].toLowerCase()}` : 'New subscription or bill'}
      onDelete={isEditing ? remove : undefined}
    >
      <div className="flex flex-col gap-4">
        <Segmented value={kind} options={KINDS} labels={subscriptionKindLabel} onChange={setKind} />
        <Field label="Name">
          <TextInput autoFocus={!isEditing} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Netflix, Electricity" />
        </Field>
        <Field label="Amount">
          <AmountInput symbol={currency.symbol} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Billing cycle">
          <Segmented value={billingCycle} options={BILLING_CYCLES} labels={billingCycleLabel} onChange={setBillingCycle} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <DateInput value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="End date">
            <DateInput value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
        <Button onClick={save} className="mt-1 w-full">
          {isEditing ? 'Save changes' : 'Add'}
        </Button>
      </div>
    </FormDrawer>
  );
}
