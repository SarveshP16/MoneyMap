import { Coins } from 'lucide-react';
import { CURRENCIES } from '../../lib/types';
import { useFinanceStore } from '../../store/useFinanceStore';

export function CurrencyPicker({ compact = false }: { compact?: boolean }) {
  const currency = useFinanceStore((s) => s.currency);
  const setCurrency = useFinanceStore((s) => s.setCurrency);

  return (
    <label className="flex items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-2 text-xs text-ink-muted transition-colors hover:border-verdigris/40">
      <Coins size={14} className="shrink-0 text-verdigris" />
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as typeof currency)}
        className="w-full cursor-pointer appearance-none bg-transparent text-ink-bright outline-none"
        aria-label="Display currency"
      >
        {Object.values(CURRENCIES).map((c) => (
          <option key={c.code} value={c.code} className="bg-panel-high text-ink-bright">
            {compact ? c.isoCode : `${c.isoCode} — ${c.displayName}`}
          </option>
        ))}
      </select>
    </label>
  );
}
