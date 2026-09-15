import { useMemo, useState } from 'react';
import { Landmark, Plus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useFinanceStore } from '../../store/useFinanceStore';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { currentFinancialYearRange, financialYearLabel } from '../../lib/financeTotals';
import type { IncomeRecord } from '../../lib/types';
import { IncomeCard } from './IncomeCard';
import { IncomeForm } from './IncomeForm';

export function IncomePage() {
  const records = useFinanceStore((s) => s.incomeRecords);
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeRecord | undefined>(undefined);

  const { fyGross, fyTax, heading, sorted } = useMemo(() => {
    const { start, end } = currentFinancialYearRange(currency.isAustralian);
    const thisFy = records.filter((r) => {
      const d = new Date(r.dateReceived);
      return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
    });
    const fyGross = thisFy.reduce((s, r) => s + r.grossAmount, 0);
    const fyTax = thisFy.reduce((s, r) => s + (r.taxWithheld ?? 0), 0);
    const heading = currency.isAustralian
      ? `This financial year (${financialYearLabel(new Date(), true)})`
      : `This year (${financialYearLabel(new Date(), false)})`;
    const sorted = [...records].sort((a, b) => new Date(b.dateReceived).getTime() - new Date(a.dateReceived).getTime());
    return { fyGross, fyTax, heading, sorted };
  }, [records, currency.isAustralian]);

  return (
    <div>
      <PageHeader
        title="Income & tax"
        subtitle="Income, tax withheld, and super"
        actions={
          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            Add income
          </Button>
        }
      />

      <div className="flex flex-col gap-3 px-5 py-6 sm:px-8">
        {records.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="No income logged yet"
            description="Add an income record to start tracking it."
            action={
              <Button variant="outline" onClick={() => setFormOpen(true)}>
                Add an income record
              </Button>
            }
          />
        ) : (
          <>
            <div className="rounded-xl border border-line bg-panel p-4">
              <p className="mb-3 text-xs font-medium text-ink-muted">{heading}</p>
              <div className="grid grid-cols-3 gap-3">
                <FyStat label="Gross" value={formatCurrency(fyGross, currency)} />
                <FyStat label="Tax" value={formatCurrency(fyTax, currency)} />
                <FyStat label="Net" value={formatCurrency(fyGross - fyTax, currency)} tone="emerald" />
              </div>
            </div>

            {sorted.map((r) => (
              <IncomeCard
                key={r.id}
                record={r}
                onClick={() => {
                  setEditing(r);
                  setFormOpen(true);
                }}
              />
            ))}
          </>
        )}
      </div>

      <IncomeForm key={editing?.id ?? 'new'} open={formOpen} onClose={() => setFormOpen(false)} record={editing} />
    </div>
  );
}

function FyStat({ label, value, tone }: { label: string; value: string; tone?: 'emerald' }) {
  return (
    <div>
      <p className={`figure-sans truncate text-base font-semibold ${tone === 'emerald' ? 'text-emerald' : 'text-ink-bright'}`}>{value}</p>
      <p className="text-xs text-ink-faint">{label}</p>
    </div>
  );
}
