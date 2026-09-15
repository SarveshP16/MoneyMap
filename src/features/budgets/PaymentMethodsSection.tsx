import { CreditCard, Plus, X } from 'lucide-react';
import { IconButton } from '../../components/ui/Button';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useToastStore } from '../../store/useToastStore';

export function PaymentMethodsSection({ onAdd }: { onAdd: () => void }) {
  const methods = useFinanceStore((s) => s.paymentMethods);
  const deletePaymentMethod = useFinanceStore((s) => s.deletePaymentMethod);
  const restorePaymentMethod = useFinanceStore((s) => s.restorePaymentMethod);
  const showToast = useToastStore((s) => s.show);

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-bright">Payment methods</h3>
        <IconButton onClick={onAdd} aria-label="Add payment method">
          <Plus size={16} />
        </IconButton>
      </div>

      {methods.length === 0 ? (
        <p className="text-sm text-ink-faint">No payment methods yet</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {methods.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-ink-soft py-1.5 pl-3 pr-2 text-xs text-ink-bright"
            >
              {m.isCreditCard && <CreditCard size={13} className="text-ink-muted" />}
              {m.name}
              <button
                onClick={() => {
                  deletePaymentMethod(m.id);
                  showToast(`Deleted "${m.name}"`, { actionLabel: 'Undo', onAction: () => restorePaymentMethod(m) });
                }}
                className="rounded-full p-0.5 text-ink-faint hover:text-coral"
                aria-label={`Delete ${m.name}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
