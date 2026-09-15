import { useState } from 'react';
import { AmountInput, DateInput, Field, TextInput } from '../../components/ui/fields';
import { Button } from '../../components/ui/Button';
import { FormDrawer } from '../../components/ui/FormDrawer';
import { formatIsoDate, parseIsoDateLocal } from '../../lib/dates';
import type { Investment } from '../../lib/types';
import { currencyOf } from '../../lib/currency';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useToastStore } from '../../store/useToastStore';

export function InvestmentForm({
  open,
  onClose,
  investment,
}: {
  open: boolean;
  onClose: () => void;
  investment?: Investment;
}) {
  const isEditing = investment != null;
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const addInvestment = useFinanceStore((s) => s.addInvestment);
  const updateInvestment = useFinanceStore((s) => s.updateInvestment);
  const deleteInvestment = useFinanceStore((s) => s.deleteInvestment);
  const restoreInvestment = useFinanceStore((s) => s.restoreInvestment);
  const showToast = useToastStore((s) => s.show);

  const [name, setName] = useState(investment?.name ?? '');
  const [type, setType] = useState(investment?.type ?? '');
  const [quantity, setQuantity] = useState(investment?.quantity?.toString() ?? '');
  const [purchasePrice, setPurchasePrice] = useState(investment?.purchasePrice?.toString() ?? '');
  const [purchaseDate, setPurchaseDate] = useState(
    investment?.purchaseDate ? formatIsoDate(new Date(investment.purchaseDate)) : '',
  );
  const [currentValue, setCurrentValue] = useState(investment?.currentValue.toString() ?? '');

  function save() {
    const currentValueNum = Number.parseFloat(currentValue);
    if (!name.trim() || !Number.isFinite(currentValueNum) || currentValueNum < 0) return;
    const quantityNum = Number.parseFloat(quantity);
    const purchasePriceNum = Number.parseFloat(purchasePrice);

    const base = {
      name: name.trim(),
      type: type.trim() || undefined,
      quantity: Number.isFinite(quantityNum) ? quantityNum : undefined,
      purchasePrice: Number.isFinite(purchasePriceNum) ? purchasePriceNum : undefined,
      currentValue: currentValueNum,
      purchaseDate: purchaseDate ? parseIsoDateLocal(purchaseDate).toISOString() : undefined,
    };

    if (isEditing) {
      updateInvestment({ ...investment, ...base });
    } else {
      addInvestment(base);
    }
    onClose();
  }

  function remove() {
    if (!investment) return;
    deleteInvestment(investment.id);
    showToast(`Deleted "${investment.name}"`, { actionLabel: 'Undo', onAction: () => restoreInvestment(investment) });
    onClose();
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit investment' : 'New investment'}
      onDelete={isEditing ? remove : undefined}
    >
      <div className="flex flex-col gap-4">
        <Field label="Name / ticker">
          <TextInput autoFocus={!isEditing} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. VAS, Bitcoin" />
        </Field>
        <Field label="Type (optional)">
          <TextInput value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. ETF, Crypto, Super, Property" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity (optional)">
            <TextInput
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <Field label="Purchase price (optional)">
            <AmountInput symbol={currency.symbol} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
          </Field>
        </div>
        <Field label="Purchase date (optional)">
          <DateInput value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </Field>
        <Field label="Current value">
          <AmountInput symbol={currency.symbol} value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="0.00" />
        </Field>
        <Button onClick={save} className="mt-1 w-full">
          {isEditing ? 'Save changes' : 'Add investment'}
        </Button>
      </div>
    </FormDrawer>
  );
}
