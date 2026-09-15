import { useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { EditHint } from '../../components/ui/EditHint';
import { Trail } from '../../components/ui/Trail';
import { currencyOf, formatCurrency } from '../../lib/currency';
import type { SavingsGoal } from '../../lib/types';
import { useFinanceStore } from '../../store/useFinanceStore';
import { SavingsAmountDialog } from './SavingsAmountDialog';

export function SavingsGoalCard({ goal, onClick }: { goal: SavingsGoal; onClick: () => void }) {
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const updateSavingsGoal = useFinanceStore((s) => s.updateSavingsGoal);
  const [dialog, setDialog] = useState<'deposit' | 'withdraw' | null>(null);

  const progress = goal.targetAmount <= 0 ? null : goal.currentAmount / goal.targetAmount;
  const reached = goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount;

  return (
    <motion.div layout className="ledger-tab flex flex-col gap-2.5 rounded-xl border border-line bg-panel p-4">
      <button type="button" onClick={onClick} className="flex flex-col gap-2.5 text-left">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-ink-bright">{goal.name}</span>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className={`figure-sans text-sm ${reached ? 'font-semibold text-emerald' : 'text-ink-muted'}`}>
              {formatCurrency(goal.currentAmount, currency)} / {formatCurrency(goal.targetAmount, currency)}
            </span>
            <EditHint />
          </div>
        </div>
        {goal.bankAccount && (
          <span className="w-fit rounded-full bg-brass-soft px-2 py-0.5 text-xs font-medium text-brass">{goal.bankAccount}</span>
        )}
        {progress != null && <Trail progress={progress} tone={reached ? 'emerald' : 'verdigris'} />}
      </button>

      <div className="flex gap-2 pt-0.5">
        <button
          onClick={() => setDialog('deposit')}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald hover:bg-emerald-soft"
        >
          <Plus size={13} /> Deposit
        </button>
        <button
          onClick={() => setDialog('withdraw')}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-panel-high"
        >
          <Minus size={13} /> Withdraw
        </button>
      </div>

      <SavingsAmountDialog
        open={dialog === 'deposit'}
        onClose={() => setDialog(null)}
        title="Deposit"
        onConfirm={(amount) => updateSavingsGoal({ ...goal, currentAmount: goal.currentAmount + amount })}
      />
      <SavingsAmountDialog
        open={dialog === 'withdraw'}
        onClose={() => setDialog(null)}
        title="Withdraw"
        onConfirm={(amount) => updateSavingsGoal({ ...goal, currentAmount: Math.max(0, goal.currentAmount - amount) })}
      />
    </motion.div>
  );
}
