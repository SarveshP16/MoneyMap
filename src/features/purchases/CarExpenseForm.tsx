import { useState } from 'react';
import { AmountInput, DateInput, Field, Segmented, TextArea, TextInput } from '../../components/ui/fields';
import { Button } from '../../components/ui/Button';
import { FormDrawer } from '../../components/ui/FormDrawer';
import { formatIsoDate, parseIsoDateLocal } from '../../lib/dates';
import { CAR_EXPENSE_CATEGORIES, carExpenseCategoryLabel, type CarExpense, type CarExpenseCategory } from '../../lib/types';
import { currencyOf } from '../../lib/currency';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useToastStore } from '../../store/useToastStore';

export function CarExpenseForm({
  open,
  onClose,
  carExpense,
}: {
  open: boolean;
  onClose: () => void;
  carExpense?: CarExpense;
}) {
  const isEditing = carExpense != null;
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const addCarExpense = useFinanceStore((s) => s.addCarExpense);
  const updateCarExpense = useFinanceStore((s) => s.updateCarExpense);
  const deleteCarExpense = useFinanceStore((s) => s.deleteCarExpense);
  const restoreCarExpense = useFinanceStore((s) => s.restoreCarExpense);
  const showToast = useToastStore((s) => s.show);

  const [name, setName] = useState(carExpense?.name ?? '');
  const [amount, setAmount] = useState(carExpense?.amount.toString() ?? '');
  const [date, setDate] = useState(formatIsoDate(carExpense ? new Date(carExpense.date) : new Date()));
  const [category, setCategory] = useState<CarExpenseCategory>(carExpense?.category ?? 'service');
  const [note, setNote] = useState(carExpense?.note ?? '');

  function save() {
    const amountNum = Number.parseFloat(amount);
    if (!name.trim() || !Number.isFinite(amountNum) || amountNum <= 0) return;

    const base = {
      name: name.trim(),
      amount: amountNum,
      date: parseIsoDateLocal(date).toISOString(),
      category,
      note: note.trim() || undefined,
    };

    if (isEditing) {
      updateCarExpense({ ...carExpense, ...base });
    } else {
      addCarExpense(base);
    }
    onClose();
  }

  function remove() {
    if (!carExpense) return;
    deleteCarExpense(carExpense.id);
    showToast(`Deleted "${carExpense.name}"`, { actionLabel: 'Undo', onAction: () => restoreCarExpense(carExpense) });
    onClose();
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit car expense' : 'New car expense'}
      onDelete={isEditing ? remove : undefined}
    >
      <div className="flex flex-col gap-4">
        <Field label="Expense name">
          <TextInput autoFocus={!isEditing} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rego renewal, Oil change" />
        </Field>
        <Field label="Amount">
          <AmountInput symbol={currency.symbol} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Date">
          <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Category">
          <Segmented value={category} options={CAR_EXPENSE_CATEGORIES} labels={carExpenseCategoryLabel} onChange={setCategory} />
        </Field>
        <Field label="Note (optional)">
          <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button onClick={save} className="mt-1 w-full">
          {isEditing ? 'Save changes' : 'Add expense'}
        </Button>
      </div>
    </FormDrawer>
  );
}
