import { useMemo, useState } from 'react';
import { Building2, Columns3, Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { totalPay, totalsByBank } from '../../lib/bankTotals';
import { currencyOf } from '../../lib/currency';
import { useFinanceStore } from '../../store/useFinanceStore';
import { BankTable } from './BankTable';
import { BankTotals } from './BankTotals';
import { ColumnForm } from './ColumnForm';

export function BanksPage() {
  const rows = useFinanceStore((s) => s.bankAllocations);
  const columns = useFinanceStore((s) => s.bankColumns);
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const addRow = useFinanceStore((s) => s.addBankAllocation);
  const [columnFormOpen, setColumnFormOpen] = useState(false);
  const [focusRowId, setFocusRowId] = useState<string | null>(null);

  const pay = useMemo(() => totalPay(rows), [rows]);
  const totals = useMemo(() => totalsByBank(rows), [rows]);
  // Suggestions for the bank cell, so re-typing an account you already use
  // is a pick, not a spelling gamble.
  const bankNames = useMemo(() => [...new Set(rows.map((r) => r.bankAccount.trim()).filter(Boolean))], [rows]);

  function newRow() {
    setFocusRowId(addRow({ amount: 0, bankAccount: '' }));
  }

  const isEmpty = rows.length === 0 && columns.length === 0;

  return (
    <div>
      <PageHeader
        title="Banks"
        subtitle="How each pay is split across your bank accounts"
        actions={
          <>
            <Button variant="outline" icon={<Columns3 size={16} />} onClick={() => setColumnFormOpen(true)}>
              Add column
            </Button>
            <Button icon={<Plus size={16} />} onClick={newRow}>
              Add row
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-6 px-5 py-6 sm:px-8">
        {isEmpty ? (
          <EmptyState
            icon={Building2}
            title="No pay split yet"
            description="List how much of each pay moves to which bank account. Update it only when your pay changes."
            action={
              <Button variant="outline" onClick={newRow}>
                Add the first row
              </Button>
            }
          />
        ) : (
          <>
            <BankTotals totals={totals} pay={pay} rowCount={rows.length} currency={currency} />
            <BankTable rows={rows} columns={columns} pay={pay} bankNames={bankNames} focusRowId={focusRowId} />
          </>
        )}
      </div>

      <ColumnForm open={columnFormOpen} onClose={() => setColumnFormOpen(false)} />
    </div>
  );
}
