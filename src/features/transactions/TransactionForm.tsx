import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AmountInput, DateInput, Field, Select, TextArea, TextInput } from '../../components/ui/fields';
import { Button } from '../../components/ui/Button';
import { FormDrawer } from '../../components/ui/FormDrawer';
import { formatIsoDate, parseIsoDateLocal } from '../../lib/dates';
import type { Transaction } from '../../lib/types';
import { currencyOf } from '../../lib/currency';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useToastStore } from '../../store/useToastStore';

export function TransactionForm({
  open,
  onClose,
  transaction,
}: {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction;
}) {
  const isEditing = transaction != null;
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const categories = useFinanceStore((s) => s.categories);
  const paymentMethods = useFinanceStore((s) => s.paymentMethods);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const updateTransaction = useFinanceStore((s) => s.updateTransaction);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const restoreTransaction = useFinanceStore((s) => s.restoreTransaction);
  const showToast = useToastStore((s) => s.show);

  const [amount, setAmount] = useState(transaction?.amount.toString() ?? '');
  const [name, setName] = useState(transaction?.name ?? '');
  const [date, setDate] = useState(formatIsoDate(transaction ? new Date(transaction.date) : new Date()));
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '');
  const [paymentMethodId, setPaymentMethodId] = useState(transaction?.paymentMethodId ?? '');
  const [note, setNote] = useState(transaction?.note ?? '');
  const [showMore, setShowMore] = useState(transaction?.splitAmount != null);
  const [splitAmount, setSplitAmount] = useState(transaction?.splitAmount?.toString() ?? '');
  const [splitOwedByName, setSplitOwedByName] = useState(transaction?.splitOwedByName ?? '');

  function save() {
    const amountNum = Number.parseFloat(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) return;
    const splitNum = Number.parseFloat(splitAmount);

    const base = {
      name: name.trim() || undefined,
      date: parseIsoDateLocal(date).toISOString(),
      amount: amountNum,
      categoryId: categoryId || undefined,
      paymentMethodId: paymentMethodId || undefined,
      splitAmount: Number.isFinite(splitNum) ? splitNum : undefined,
      splitOwedByName: splitOwedByName.trim() || undefined,
      note: note.trim() || undefined,
    };

    if (isEditing) {
      updateTransaction({
        ...transaction,
        ...base,
        splitPaidBack: transaction.splitPaidBack,
        movedToCreditCard: transaction.movedToCreditCard,
      });
    } else {
      addTransaction({ ...base, splitPaidBack: false, movedToCreditCard: false });
    }
    onClose();
  }

  function remove() {
    if (!transaction) return;
    deleteTransaction(transaction.id);
    showToast(`Deleted "${name || 'expense'}"`, { actionLabel: 'Undo', onAction: () => restoreTransaction(transaction) });
    onClose();
  }

  return (
    <FormDrawer open={open} onClose={onClose} title={isEditing ? 'Edit expense' : 'New expense'} onDelete={isEditing ? remove : undefined}>
      <div className="flex flex-col gap-4">
        <Field label="Amount">
          <AmountInput
            symbol={currency.symbol}
            value={amount}
            autoFocus={!isEditing}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </Field>

        <Field label="What was it? (optional)">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Groceries" />
        </Field>

        <Field label="Date">
          <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        {categories.length > 0 && (
          <Field label="Category (optional)">
            <Select value={categoryId} onChange={setCategoryId}>
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {paymentMethods.length > 0 && (
          <Field label="Payment method (optional)">
            <Select value={paymentMethodId} onChange={setPaymentMethodId}>
              <option value="">None</option>
              {paymentMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Note (optional)">
          <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="flex items-center gap-1 self-start text-sm font-semibold text-amber"
        >
          {showMore ? 'Hide more options' : 'More options'}
          {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showMore && (
          <div className="flex flex-col gap-4">
            <Field label="Split amount someone owes you (optional)">
              <AmountInput
                symbol={currency.symbol}
                value={splitAmount}
                onChange={(e) => setSplitAmount(e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field label="Owed by (optional)">
              <TextInput
                value={splitOwedByName}
                onChange={(e) => setSplitOwedByName(e.target.value)}
                placeholder="Who owes you this?"
              />
            </Field>
          </div>
        )}

        <Button onClick={save} className="mt-1 w-full">
          {isEditing ? 'Save changes' : 'Add expense'}
        </Button>
      </div>
    </FormDrawer>
  );
}
