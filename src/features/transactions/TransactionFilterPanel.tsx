import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { FormDrawer } from '../../components/ui/FormDrawer';
import { AmountInput, DateInput, Field, Select } from '../../components/ui/fields';
import { formatIsoDate, parseIsoDateLocal } from '../../lib/dates';
import { currencyOf } from '../../lib/currency';
import { distinctOwedByNames, type TransactionFilter } from '../../lib/transactionFiltering';
import { useFinanceStore } from '../../store/useFinanceStore';

export function TransactionFilterPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const categories = useFinanceStore((s) => s.categories);
  const paymentMethods = useFinanceStore((s) => s.paymentMethods);
  const transactions = useFinanceStore((s) => s.transactions);
  const filter = useFinanceStore((s) => s.filter);
  const applyFilter = useFinanceStore((s) => s.applyFilter);
  const clearFilter = useFinanceStore((s) => s.clearFilter);

  const [startDate, setStartDate] = useState(filter.startDate ? formatIsoDate(new Date(filter.startDate)) : '');
  const [endDate, setEndDate] = useState(filter.endDate ? formatIsoDate(new Date(filter.endDate)) : '');
  const [categoryId, setCategoryId] = useState(filter.categoryId ?? '');
  const [paymentMethodId, setPaymentMethodId] = useState(filter.paymentMethodId ?? '');
  const [minAmount, setMinAmount] = useState(filter.minAmount?.toString() ?? '');
  const [maxAmount, setMaxAmount] = useState(filter.maxAmount?.toString() ?? '');
  const [owedByName, setOwedByName] = useState(filter.owedByName ?? '');

  const owedByNames = distinctOwedByNames(transactions);

  function apply() {
    const next: TransactionFilter = {
      startDate: startDate ? parseIsoDateLocal(startDate).toISOString() : undefined,
      endDate: endDate ? parseIsoDateLocal(endDate).toISOString() : undefined,
      categoryId: categoryId || undefined,
      paymentMethodId: paymentMethodId || undefined,
      minAmount: minAmount ? Number.parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? Number.parseFloat(maxAmount) : undefined,
      owedByName: owedByName || undefined,
    };
    applyFilter(next);
    onClose();
  }

  function clear() {
    clearFilter();
    setStartDate('');
    setEndDate('');
    setCategoryId('');
    setPaymentMethodId('');
    setMinAmount('');
    setMaxAmount('');
    setOwedByName('');
    onClose();
  }

  return (
    <FormDrawer open={open} onClose={onClose} title="Filter expenses">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <DateInput value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="To">
            <DateInput value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>

        {categories.length > 0 && (
          <Field label="Category">
            <Select value={categoryId} onChange={setCategoryId}>
              <option value="">Any</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {paymentMethods.length > 0 && (
          <Field label="Payment method">
            <Select value={paymentMethodId} onChange={setPaymentMethodId}>
              <option value="">Any</option>
              {paymentMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Min amount">
            <AmountInput symbol={currency.symbol} value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
          </Field>
          <Field label="Max amount">
            <AmountInput symbol={currency.symbol} value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
          </Field>
        </div>

        {owedByNames.length > 0 && (
          <Field label="Owed by">
            <Select value={owedByName} onChange={setOwedByName}>
              <option value="">Anyone</option>
              {owedByNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="mt-2 flex gap-2">
          <Button variant="outline" onClick={clear} className="flex-1">
            Clear
          </Button>
          <Button onClick={apply} className="flex-1">
            Apply filter
          </Button>
        </div>
      </div>
    </FormDrawer>
  );
}
