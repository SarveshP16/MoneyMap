import { useRef, useState, type InputHTMLAttributes } from 'react';
import { Trash2 } from 'lucide-react';
import { IconButton } from '../../components/ui/Button';
import { columnTotal, formatShare, parseAmount } from '../../lib/bankTotals';
import { currencyOf, formatCurrency } from '../../lib/currency';
import type { BankAllocation, BankColumn } from '../../lib/types';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useToastStore } from '../../store/useToastStore';

const cellClasses =
  'w-full bg-transparent px-3 py-2.5 text-sm text-ink-bright placeholder:text-ink-faint outline-none transition-colors focus:bg-ink-soft';

/** An input that edits locally and saves once, on blur/Enter. Every store
 *  mutation syncs the whole state to the server, so saving per keystroke
 *  would fire a request for every character typed. `parse` turns the draft
 *  into what gets saved; returning null rejects the edit and the cell snaps
 *  back. While focused, a poll updating `value` from another device doesn't
 *  clobber what you're typing. */
function CellInput({
  value,
  onCommit,
  parse,
  ...props
}: {
  value: string;
  onCommit: (next: string) => void;
  parse?: (draft: string) => string | null;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur' | 'onFocus' | 'onKeyDown'>) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);

  const cancelled = useRef(false);

  // Unfocused, the cell simply shows the stored value; the draft only
  // exists while it's being edited.
  function commit() {
    setFocused(false);
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const next = parse ? parse(draft) : draft;
    if (next != null && next !== value) onCommit(next);
  }

  return (
    <input
      {...props}
      value={focused ? draft : value}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => {
        setDraft(value);
        setFocused(true);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          cancelled.current = true; // blur would otherwise save the draft
          e.currentTarget.blur();
        }
      }}
    />
  );
}

function formatPlain(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}

export function BankTable({
  rows,
  columns,
  pay,
  bankNames,
  focusRowId,
}: {
  rows: BankAllocation[];
  columns: BankColumn[];
  pay: number;
  bankNames: string[];
  focusRowId: string | null;
}) {
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const updateRow = useFinanceStore((s) => s.updateBankAllocation);
  const deleteRow = useFinanceStore((s) => s.deleteBankAllocation);
  const restoreRow = useFinanceStore((s) => s.restoreBankAllocation);
  const updateColumn = useFinanceStore((s) => s.updateBankColumn);
  const deleteColumn = useFinanceStore((s) => s.deleteBankColumn);
  const restoreColumn = useFinanceStore((s) => s.restoreBankColumn);
  const showToast = useToastStore((s) => s.show);

  function removeRow(row: BankAllocation) {
    const index = rows.findIndex((r) => r.id === row.id);
    deleteRow(row.id);
    showToast(`Deleted ${row.bankAccount.trim() || 'row'}`, { actionLabel: 'Undo', onAction: () => restoreRow(row, index) });
  }

  function removeColumn(column: BankColumn) {
    const index = columns.findIndex((c) => c.id === column.id);
    deleteColumn(column.id);
    showToast(`Deleted column "${column.name}"`, { actionLabel: 'Undo', onAction: () => restoreColumn(column, index) });
  }

  const headClasses = 'px-3 py-2.5 text-left text-xs font-medium text-ink-muted';
  const hasNumberColumn = columns.some((c) => c.kind === 'number');

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-panel">
      <datalist id="bank-names">
        {bankNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <table className="w-full min-w-[40rem] border-collapse">
        <thead>
          <tr className="border-b border-line bg-ink-soft/60">
            <th className={`${headClasses} w-44`}>Pay money</th>
            <th className={`${headClasses} w-52`}>Bank account</th>
            <th className={`${headClasses} min-w-[12rem]`}>Notes</th>
            {columns.map((c) => (
              <th key={c.id} className="min-w-[9rem] p-0 text-left">
                <div className="flex items-center">
                  <CellInput
                    aria-label={`Rename column ${c.name}`}
                    value={c.name}
                    parse={(d) => d.trim() || null}
                    onCommit={(name) => updateColumn({ ...c, name })}
                    className={`${cellClasses} !text-xs font-medium !text-ink-muted focus:!text-ink-bright`}
                  />
                  <IconButton aria-label={`Delete column ${c.name}`} onClick={() => removeColumn(c)} className="mr-1 !h-7 !w-7 shrink-0">
                    <Trash2 size={13} />
                  </IconButton>
                </div>
              </th>
            ))}
            <th className={`${headClasses} w-20 text-right`}>% of pay</th>
            <th className="w-12" aria-label="Row actions" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5 + columns.length} className="px-3 py-8 text-center text-sm text-ink-faint">
                No rows yet — use “Add row” to start your split.
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-b-0">
              <td>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                    {currency.symbol}
                  </span>
                  <CellInput
                    aria-label="Pay money"
                    inputMode="decimal"
                    placeholder="0.00"
                    autoFocus={row.id === focusRowId}
                    value={row.amount === 0 ? '' : String(row.amount)}
                    parse={(d) => {
                      const n = parseAmount(d);
                      return n == null ? null : n === 0 ? '' : String(n);
                    }}
                    onCommit={(text) => updateRow({ ...row, amount: parseAmount(text) ?? 0 })}
                    className={`${cellClasses} figure-sans !pl-8`}
                  />
                </div>
              </td>
              <td>
                <CellInput
                  aria-label="Bank account"
                  list="bank-names"
                  placeholder="e.g. MQ Savings"
                  value={row.bankAccount}
                  parse={(d) => d.trim()}
                  onCommit={(bankAccount) => updateRow({ ...row, bankAccount })}
                  className={cellClasses}
                />
              </td>
              <td>
                <CellInput
                  aria-label="Notes"
                  placeholder="Notes"
                  value={row.note ?? ''}
                  parse={(d) => d.trim()}
                  onCommit={(note) => updateRow({ ...row, note: note || undefined })}
                  className={cellClasses}
                />
              </td>
              {columns.map((c) => (
                <td key={c.id}>
                  <CellInput
                    aria-label={c.name}
                    inputMode={c.kind === 'number' ? 'decimal' : undefined}
                    value={row.extras?.[c.id] ?? ''}
                    parse={(d) => d.trim()}
                    onCommit={(text) => updateRow({ ...row, extras: { ...row.extras, [c.id]: text } })}
                    className={`${cellClasses} ${c.kind === 'number' ? 'figure-sans' : ''}`}
                  />
                </td>
              ))}
              <td className="figure-sans px-3 text-right text-sm text-ink-muted">{formatShare(pay > 0 ? row.amount / pay : null)}</td>
              <td className="pr-1 text-right">
                <IconButton aria-label="Delete row" onClick={() => removeRow(row)} className="!h-8 !w-8">
                  <Trash2 size={14} />
                </IconButton>
              </td>
            </tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t border-line bg-ink-soft/60">
              <td className="figure-sans px-3 py-3 text-sm font-semibold text-ink-bright">{formatCurrency(pay, currency)}</td>
              <td className="px-3 py-3 text-xs font-medium text-ink-muted">Total pay</td>
              <td />
              {columns.map((c) => (
                <td key={c.id} className="figure-sans px-3 py-3 text-sm font-medium text-ink-bright">
                  {hasNumberColumn && c.kind === 'number' ? formatPlain(columnTotal(rows, c)) : ''}
                </td>
              ))}
              <td className="figure-sans px-3 py-3 text-right text-sm text-ink-muted">{formatShare(pay > 0 ? 1 : null)}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
