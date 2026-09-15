import { useState } from 'react';
import { AmountInput, DateInput, Field, TextInput } from '../../components/ui/fields';
import { Button } from '../../components/ui/Button';
import { FormDrawer } from '../../components/ui/FormDrawer';
import { formatIsoDate, parseIsoDateLocal } from '../../lib/dates';
import type { SavingsGoal } from '../../lib/types';
import { currencyOf } from '../../lib/currency';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useToastStore } from '../../store/useToastStore';

export function SavingsGoalForm({
  open,
  onClose,
  goal,
}: {
  open: boolean;
  onClose: () => void;
  goal?: SavingsGoal;
}) {
  const isEditing = goal != null;
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const addSavingsGoal = useFinanceStore((s) => s.addSavingsGoal);
  const updateSavingsGoal = useFinanceStore((s) => s.updateSavingsGoal);
  const deleteSavingsGoal = useFinanceStore((s) => s.deleteSavingsGoal);
  const restoreSavingsGoal = useFinanceStore((s) => s.restoreSavingsGoal);
  const showToast = useToastStore((s) => s.show);

  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal?.targetAmount.toString() ?? '');
  const [current, setCurrent] = useState(goal?.currentAmount.toString() ?? '');
  const [startDate, setStartDate] = useState(goal?.startDate ? formatIsoDate(new Date(goal.startDate)) : '');
  const [targetDate, setTargetDate] = useState(goal?.targetDate ? formatIsoDate(new Date(goal.targetDate)) : '');
  const [bankAccount, setBankAccount] = useState(goal?.bankAccount ?? '');

  function save() {
    const targetNum = Number.parseFloat(target);
    if (!name.trim() || !Number.isFinite(targetNum) || targetNum <= 0) return;
    const currentNum = Number.parseFloat(current);

    const base = {
      name: name.trim(),
      targetAmount: targetNum,
      currentAmount: Number.isFinite(currentNum) ? currentNum : 0,
      startDate: startDate ? parseIsoDateLocal(startDate).toISOString() : undefined,
      targetDate: targetDate ? parseIsoDateLocal(targetDate).toISOString() : undefined,
      bankAccount: bankAccount.trim() || undefined,
    };

    if (isEditing) {
      updateSavingsGoal({ ...goal, ...base });
    } else {
      addSavingsGoal(base);
    }
    onClose();
  }

  function remove() {
    if (!goal) return;
    deleteSavingsGoal(goal.id);
    showToast(`Deleted "${goal.name}"`, { actionLabel: 'Undo', onAction: () => restoreSavingsGoal(goal) });
    onClose();
  }

  return (
    <FormDrawer open={open} onClose={onClose} title={isEditing ? 'Edit goal' : 'New savings goal'} onDelete={isEditing ? remove : undefined}>
      <div className="flex flex-col gap-4">
        <Field label="Goal name">
          <TextInput autoFocus={!isEditing} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency fund" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target amount">
            <AmountInput symbol={currency.symbol} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0.00" />
          </Field>
          <Field label="Current amount">
            <AmountInput symbol={currency.symbol} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="0.00" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <DateInput value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Target date">
            <DateInput value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Bank account (optional)">
          <TextInput value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} />
        </Field>
        <Button onClick={save} className="mt-1 w-full">
          {isEditing ? 'Save changes' : 'Add goal'}
        </Button>
      </div>
    </FormDrawer>
  );
}
