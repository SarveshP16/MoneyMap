import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { EditHint } from '../../components/ui/EditHint';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { investmentGainLoss, type Investment } from '../../lib/types';
import { useFinanceStore } from '../../store/useFinanceStore';

export function InvestmentCard({ investment, onClick }: { investment: Investment; onClick: () => void }) {
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const gainLoss = investmentGainLoss(investment);

  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      whileHover={{ y: -2 }}
      className="ledger-tab flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-panel p-4 text-left transition-colors hover:border-verdigris/30"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-bright">{investment.name}</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          {[investment.type, investment.quantity != null ? `${investment.quantity} units` : null]
            .filter(Boolean)
            .join(' · ') || 'No details set'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <div className="text-right">
          <p className="figure-sans text-sm font-semibold text-ink-bright">{formatCurrency(investment.currentValue, currency)}</p>
          {gainLoss != null && (
            <p className={`mt-0.5 flex items-center justify-end gap-0.5 text-xs ${gainLoss >= 0 ? 'text-emerald' : 'text-coral'}`}>
              {gainLoss >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {formatCurrency(Math.abs(gainLoss), currency)}
            </p>
          )}
        </div>
        <EditHint />
      </div>
    </motion.button>
  );
}
