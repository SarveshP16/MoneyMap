import { useEffect, useState } from 'react';
import { AmountInput, DateInput, Field, Segmented, TextInput, Toggle } from '../../components/ui/fields';
import { Button } from '../../components/ui/Button';
import { FormDrawer } from '../../components/ui/FormDrawer';
import { BUDGET_PERIODS, budgetPeriodLabel, type BudgetPeriod, type Category } from '../../lib/types';
import { nextRolloverFields, periodRange } from '../../lib/budgetCalculations';
import { formatDayRange, parseIsoDateLocal } from '../../lib/dates';
import { currencyOf } from '../../lib/currency';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useToastStore } from '../../store/useToastStore';

const weekdayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
const shortDateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** When the budget resets, in words — the payday-style anchor makes the
 *  date picker's effect otherwise hard to guess. */
function cadence(period: BudgetPeriod, anchor: string): string {
  if (!anchor) {
    return {
      weekly: 'Resets every Monday. Pick a date, like a payday, to reset on that weekday instead.',
      fortnightly: 'Covers the 14 days up to the coming Wednesday. Pick a date, like a payday, to count fortnights from it.',
      monthly: 'Resets on the 1st. Pick a date to reset on that day of the month instead.',
    }[period];
  }
  const date = parseIsoDateLocal(anchor);
  switch (period) {
    case 'weekly':
      return `Resets every ${weekdayFormat.format(date)}.`;
    case 'fortnightly':
      return `Resets every second ${weekdayFormat.format(date)}, counting from ${shortDateFormat.format(date)}.`;
    case 'monthly':
      return `Resets on the ${ordinal(date.getDate())} of each month (or the month's last day if shorter).`;
  }
}

export function CategoryForm({
  open,
  onClose,
  category,
}: {
  open: boolean;
  onClose: () => void;
  category?: Category;
}) {
  const isEditing = category != null;
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const addCategory = useFinanceStore((s) => s.addCategory);
  const updateCategory = useFinanceStore((s) => s.updateCategory);
  const deleteCategory = useFinanceStore((s) => s.deleteCategory);
  const restoreCategory = useFinanceStore((s) => s.restoreCategory);
  const showToast = useToastStore((s) => s.show);

  const [name, setName] = useState(category?.name ?? '');
  const [amount, setAmount] = useState(category?.budgetAmount?.toString() ?? '');
  const [period, setPeriod] = useState<BudgetPeriod>(category?.period ?? 'monthly');
  const [anchor, setAnchor] = useState(category?.periodAnchor ?? '');
  const [rollover, setRollover] = useState(category?.rolloverSince != null);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setAmount(category?.budgetAmount?.toString() ?? '');
    setPeriod(category?.period ?? 'monthly');
    setAnchor(category?.periodAnchor ?? '');
    setRollover(category?.rolloverSince != null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const current = periodRange({ period, periodAnchor: anchor || undefined }, new Date());
  const parsedAmount = Number.parseFloat(amount);
  // Carry-over needs a fixed schedule to count periods on, and an amount to carry.
  const canRollover = anchor !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const rolloverRestarts =
    category?.rolloverSince != null && (period !== category.period || (anchor || undefined) !== category.periodAnchor);

  function save() {
    if (!name.trim()) return;
    const settings = {
      budgetAmount: Number.isFinite(parsedAmount) ? parsedAmount : undefined,
      period,
      periodAnchor: anchor || undefined,
    };
    const base = {
      name: name.trim(),
      ...settings,
      ...nextRolloverFields(category, settings, rollover && canRollover, new Date()),
    };
    if (isEditing) {
      updateCategory({ ...category, ...base });
    } else {
      addCategory(base);
    }
    onClose();
  }

  function remove() {
    if (!category) return;
    deleteCategory(category.id);
    showToast(`Deleted "${category.name}"`, { actionLabel: 'Undo', onAction: () => restoreCategory(category) });
    onClose();
  }

  return (
    <FormDrawer open={open} onClose={onClose} title={isEditing ? 'Edit category' : 'New category'} onDelete={isEditing ? remove : undefined}>
      <div className="flex flex-col gap-4">
        <Field label="Category name">
          <TextInput autoFocus={!isEditing} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Groceries" />
        </Field>
        <Field label="Budget amount (optional)">
          <AmountInput symbol={currency.symbol} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Period">
          <Segmented value={period} options={BUDGET_PERIODS} labels={budgetPeriodLabel} onChange={setPeriod} />
        </Field>
        <Field label="Starts on (optional)">
          <div className="flex gap-2">
            <DateInput value={anchor} onChange={(e) => setAnchor(e.target.value)} className="flex-1" />
            {anchor && (
              <button
                type="button"
                onClick={() => setAnchor('')}
                className="shrink-0 rounded-lg border border-line px-3 text-xs font-medium text-ink-muted transition-colors hover:border-verdigris/40 hover:text-ink-bright"
              >
                Clear
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-ink-faint">
            {cadence(period, anchor)} This period: {formatDayRange(current.start, current.end)}.
          </p>
        </Field>
        {canRollover && (
          <div className="flex flex-col gap-1.5">
            <Toggle
              checked={rollover}
              onChange={setRollover}
              label="Carry over leftovers"
              description="Overspending comes off the next period; anything left is added to it"
            />
            {rollover && rolloverRestarts && (
              <p className="text-xs text-brass">Changing the period or start date starts the carry-over again from zero.</p>
            )}
          </div>
        )}
        <Button onClick={save} className="mt-1 w-full">
          {isEditing ? 'Save changes' : 'Add category'}
        </Button>
      </div>
    </FormDrawer>
  );
}
