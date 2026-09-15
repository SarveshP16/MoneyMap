import { useEffect, useState } from 'react';
import { AmountInput, DateInput, Field, TextArea, TextInput } from '../../components/ui/fields';
import { Button } from '../../components/ui/Button';
import { FormDrawer } from '../../components/ui/FormDrawer';
import { formatIsoDate, parseIsoDateLocal } from '../../lib/dates';
import type { Purchase } from '../../lib/types';
import { currencyOf } from '../../lib/currency';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useToastStore } from '../../store/useToastStore';

export function PurchaseForm({
  open,
  onClose,
  purchase,
}: {
  open: boolean;
  onClose: () => void;
  purchase?: Purchase;
}) {
  const isEditing = purchase != null;
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const addPurchase = useFinanceStore((s) => s.addPurchase);
  const updatePurchase = useFinanceStore((s) => s.updatePurchase);
  const deletePurchase = useFinanceStore((s) => s.deletePurchase);
  const restorePurchase = useFinanceStore((s) => s.restorePurchase);
  const showToast = useToastStore((s) => s.show);

  const [name, setName] = useState(purchase?.name ?? '');
  const [amount, setAmount] = useState(purchase?.amount.toString() ?? '');
  const [date, setDate] = useState(formatIsoDate(purchase ? new Date(purchase.date) : new Date()));
  const [note, setNote] = useState(purchase?.note ?? '');

  // The drawer's contents stay mounted between an "Add" and the next one —
  // only opening/closing toggles, the component itself doesn't remount —
  // so without this, a second "New purchase" would still show the last
  // purchase's leftover values. Reset every time the drawer opens instead.
  useEffect(() => {
    if (!open) return;
    setName(purchase?.name ?? '');
    setAmount(purchase?.amount.toString() ?? '');
    setDate(formatIsoDate(purchase ? new Date(purchase.date) : new Date()));
    setNote(purchase?.note ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function save() {
    const amountNum = Number.parseFloat(amount);
    if (!name.trim() || !Number.isFinite(amountNum) || amountNum <= 0) return;

    const base = {
      name: name.trim(),
      amount: amountNum,
      date: parseIsoDateLocal(date).toISOString(),
      note: note.trim() || undefined,
    };

    if (isEditing) {
      updatePurchase({ ...purchase, ...base });
    } else {
      addPurchase(base);
    }
    onClose();
  }

  function remove() {
    if (!purchase) return;
    deletePurchase(purchase.id);
    showToast(`Deleted "${purchase.name}"`, { actionLabel: 'Undo', onAction: () => restorePurchase(purchase) });
    onClose();
  }

  return (
    <FormDrawer open={open} onClose={onClose} title={isEditing ? 'Edit purchase' : 'New purchase'} onDelete={isEditing ? remove : undefined}>
      <div className="flex flex-col gap-4">
        <Field label="What was it?">
          <TextInput autoFocus={!isEditing} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Laptop, Sofa" />
        </Field>
        <Field label="Amount">
          <AmountInput symbol={currency.symbol} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Date">
          <DateInput value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Note (optional)">
          <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button onClick={save} className="mt-1 w-full">
          {isEditing ? 'Save changes' : 'Add purchase'}
        </Button>
      </div>
    </FormDrawer>
  );
}
