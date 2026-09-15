import { useEffect, useState } from 'react';
import { AmountInput, Field, Segmented, TextInput } from '../../components/ui/fields';
import { Button } from '../../components/ui/Button';
import { FormDrawer } from '../../components/ui/FormDrawer';
import { BUDGET_PERIODS, budgetPeriodLabel, type BudgetPeriod, type Category } from '../../lib/types';
import { currencyOf } from '../../lib/currency';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useToastStore } from '../../store/useToastStore';

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

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setAmount(category?.budgetAmount?.toString() ?? '');
    setPeriod(category?.period ?? 'monthly');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function save() {
    if (!name.trim()) return;
    const budgetAmount = Number.parseFloat(amount);
    const base = { name: name.trim(), budgetAmount: Number.isFinite(budgetAmount) ? budgetAmount : undefined, period };
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
        <Button onClick={save} className="mt-1 w-full">
          {isEditing ? 'Save changes' : 'Add category'}
        </Button>
      </div>
    </FormDrawer>
  );
}
