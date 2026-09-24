import { Building2 } from 'lucide-react';
import { CountUp } from '../../components/ui/CountUp';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { formatShare, type BankTotal } from '../../lib/bankTotals';

/** The whole pay as a headline figure, beside where it's all going. The bars
 *  are each bank's share of the pay on a shared 0–100% track — one measure,
 *  so one hue; the bank name (not colour) is what tells them apart. Value and
 *  share sit in a fixed column at the right, so they're always readable
 *  rather than squeezed inside short bars. */
export function BankTotals({
  totals,
  pay,
  rowCount,
  currency,
}: {
  totals: BankTotal[];
  pay: number;
  rowCount: number;
  currency: ReturnType<typeof currencyOf>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="rounded-xl border border-line bg-panel p-5">
        <div className="flex items-center gap-2 text-ink-muted">
          <Building2 size={15} />
          <span className="text-xs font-medium">Whole pay</span>
        </div>
        <p className="figure mt-2 text-3xl font-medium text-ink-bright">
          <CountUp value={pay} format={(n) => formatCurrency(n, currency)} />
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          {rowCount} {rowCount === 1 ? 'row' : 'rows'} · {totals.length} {totals.length === 1 ? 'bank' : 'banks'}
        </p>
      </div>

      <div className="rounded-xl border border-line bg-panel p-5">
        <h2 className="mb-3 text-xs font-medium text-ink-muted">By bank account</h2>
        {totals.length === 0 ? (
          <p className="text-sm text-ink-faint">Enter an amount and a bank in the table to see where your pay goes.</p>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Pay by bank account">
            {totals.map((t) => (
              <li
                key={t.label}
                title={`${t.label}: ${formatCurrency(t.total, currency)} (${formatShare(t.share)})`}
                className="grid grid-cols-[minmax(4.5rem,7rem)_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_11rem]"
              >
                <span className="truncate text-sm text-ink-bright">{t.label}</span>
                <span className="h-3 overflow-hidden rounded-r-[4px] bg-panel-high">
                  <span
                    className="block h-full min-w-[2px] rounded-r-[4px] bg-verdigris transition-[width] duration-500 motion-reduce:transition-none"
                    style={{ width: `${t.share * 100}%` }}
                  />
                </span>
                <span className="figure-sans flex items-baseline justify-end gap-2 text-right text-sm text-ink-bright">
                  {formatCurrency(t.total, currency)}
                  <span className="w-10 text-xs text-ink-muted">{formatShare(t.share)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
