import { useEffect, useState } from 'react';
import { AmountInput, DateInput, Field, TextArea, TextInput } from '../../components/ui/fields';
import { Button } from '../../components/ui/Button';
import { FormDrawer } from '../../components/ui/FormDrawer';
import { formatIsoDate, parseIsoDateLocal } from '../../lib/dates';
import { financialYearLabel } from '../../lib/financeTotals';
import { incomeTypeLabel, type IncomeRecord, type IncomeType } from '../../lib/types';
import { currencyOf } from '../../lib/currency';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useToastStore } from '../../store/useToastStore';

const INCOME_TYPES: IncomeType[] = ['tfn', 'abn'];

export function IncomeForm({
  open,
  onClose,
  record,
}: {
  open: boolean;
  onClose: () => void;
  record?: IncomeRecord;
}) {
  const isEditing = record != null;
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const addIncomeRecord = useFinanceStore((s) => s.addIncomeRecord);
  const updateIncomeRecord = useFinanceStore((s) => s.updateIncomeRecord);
  const deleteIncomeRecord = useFinanceStore((s) => s.deleteIncomeRecord);
  const restoreIncomeRecord = useFinanceStore((s) => s.restoreIncomeRecord);
  const showToast = useToastStore((s) => s.show);

  const [sourceName, setSourceName] = useState(record?.sourceName ?? '');
  const [incomeType, setIncomeType] = useState<IncomeType | undefined>(record?.incomeType);
  const [dateReceived, setDateReceived] = useState(
    formatIsoDate(record ? new Date(record.dateReceived) : new Date()),
  );
  const [gross, setGross] = useState(record?.grossAmount.toString() ?? '');
  const [net, setNet] = useState(record?.netAmount?.toString() ?? '');
  const [tax, setTax] = useState(record?.taxWithheld?.toString() ?? '');
  const [superAmount, setSuperAmount] = useState(record?.superAmount?.toString() ?? '');
  const [note, setNote] = useState(record?.note ?? '');

  useEffect(() => {
    if (!open) return;
    setSourceName(record?.sourceName ?? '');
    setIncomeType(record?.incomeType);
    setDateReceived(formatIsoDate(record ? new Date(record.dateReceived) : new Date()));
    setGross(record?.grossAmount.toString() ?? '');
    setNet(record?.netAmount?.toString() ?? '');
    setTax(record?.taxWithheld?.toString() ?? '');
    setSuperAmount(record?.superAmount?.toString() ?? '');
    setNote(record?.note ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const parsedDate = dateReceived ? parseIsoDateLocal(dateReceived) : new Date();

  function save() {
    const grossNum = Number.parseFloat(gross);
    if (!sourceName.trim() || !Number.isFinite(grossNum) || grossNum <= 0) return;
    const netNum = Number.parseFloat(net);
    const taxNum = Number.parseFloat(tax);
    const superNum = Number.parseFloat(superAmount);

    const base = {
      sourceName: sourceName.trim(),
      incomeType,
      dateReceived: parsedDate.toISOString(),
      grossAmount: grossNum,
      netAmount: Number.isFinite(netNum) ? netNum : undefined,
      taxWithheld: Number.isFinite(taxNum) ? taxNum : undefined,
      superAmount: Number.isFinite(superNum) ? superNum : undefined,
      note: note.trim() || undefined,
    };

    if (isEditing) {
      updateIncomeRecord({ ...record, ...base });
    } else {
      addIncomeRecord(base);
    }
    onClose();
  }

  function remove() {
    if (!record) return;
    deleteIncomeRecord(record.id);
    showToast(`Deleted "${record.sourceName}"`, { actionLabel: 'Undo', onAction: () => restoreIncomeRecord(record) });
    onClose();
  }

  return (
    <FormDrawer open={open} onClose={onClose} title={isEditing ? 'Edit income' : 'New income'} onDelete={isEditing ? remove : undefined}>
      <div className="flex flex-col gap-4">
        <Field label="Source name">
          <TextInput
            autoFocus={!isEditing}
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="e.g. Salary, Freelance client"
          />
        </Field>

        {currency.isAustralian && (
          <Field label="Income type (optional)">
            <div className="flex gap-2">
              {INCOME_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setIncomeType(incomeType === type ? undefined : type)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    incomeType === type ? 'bg-amber text-ink-on-parchment' : 'border border-line text-ink-muted'
                  }`}
                >
                  {incomeTypeLabel[type]}
                </button>
              ))}
            </div>
          </Field>
        )}

        <div className="flex items-end gap-3">
          <Field label="Date received">
            <DateInput value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} />
          </Field>
          <p className="pb-2.5 text-xs text-ink-faint">{financialYearLabel(parsedDate, currency.isAustralian)}</p>
        </div>

        <Field label="Gross amount">
          <AmountInput symbol={currency.symbol} value={gross} onChange={(e) => setGross(e.target.value)} placeholder="0.00" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Net (optional)">
            <AmountInput symbol={currency.symbol} value={net} onChange={(e) => setNet(e.target.value)} />
          </Field>
          <Field label="Tax (optional)">
            <AmountInput symbol={currency.symbol} value={tax} onChange={(e) => setTax(e.target.value)} />
          </Field>
        </div>

        {currency.isAustralian && (
          <Field label="Super (optional)">
            <AmountInput symbol={currency.symbol} value={superAmount} onChange={(e) => setSuperAmount(e.target.value)} />
          </Field>
        )}

        <Field label="Note (optional)">
          <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        <Button onClick={save} className="mt-1 w-full">
          {isEditing ? 'Save changes' : 'Add income'}
        </Button>
      </div>
    </FormDrawer>
  );
}
