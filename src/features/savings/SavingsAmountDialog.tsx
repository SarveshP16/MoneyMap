import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { AmountInput } from '../../components/ui/fields';
import { currencyOf } from '../../lib/currency';
import { useFinanceStore } from '../../store/useFinanceStore';

export function SavingsAmountDialog({
  open,
  onClose,
  title,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  onConfirm: (amount: number) => void;
}) {
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const [amount, setAmount] = useState('');

  function submit() {
    const n = Number.parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    onConfirm(n);
    setAmount('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <AmountInput
        symbol={currency.symbol}
        value={amount}
        autoFocus
        onChange={(e) => setAmount(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="0.00"
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit}>Confirm</Button>
      </div>
    </Modal>
  );
}
