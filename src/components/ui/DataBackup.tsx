import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { backupItemCount, downloadBackup, parseBackup, readFileAsText } from '../../lib/backup';
import type { FinanceBackupData } from '../../store/useFinanceStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useToastStore } from '../../store/useToastStore';
import { Button } from './Button';
import { Modal } from './Modal';

/** Export/import the whole app as one JSON file — a copy you hold
 *  yourself, independent of the cloud backend. Lives in the sidebar footer next to
 *  the currency picker, on both desktop and mobile nav. */
export function DataBackup() {
  const transactions = useFinanceStore((s) => s.transactions);
  const categories = useFinanceStore((s) => s.categories);
  const paymentMethods = useFinanceStore((s) => s.paymentMethods);
  const savingsGoals = useFinanceStore((s) => s.savingsGoals);
  const investments = useFinanceStore((s) => s.investments);
  const subscriptions = useFinanceStore((s) => s.subscriptions);
  const incomeRecords = useFinanceStore((s) => s.incomeRecords);
  const purchases = useFinanceStore((s) => s.purchases);
  const carExpenses = useFinanceStore((s) => s.carExpenses);
  const bankAllocations = useFinanceStore((s) => s.bankAllocations);
  const bankColumns = useFinanceStore((s) => s.bankColumns);
  const currency = useFinanceStore((s) => s.currency);
  const restoreAll = useFinanceStore((s) => s.restoreAll);

  const showToast = useToastStore((s) => s.show);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Partial<FinanceBackupData> | null>(null);

  async function exportData() {
    const data: FinanceBackupData = {
      transactions,
      categories,
      paymentMethods,
      savingsGoals,
      investments,
      subscriptions,
      incomeRecords,
      purchases,
      carExpenses,
      bankAllocations,
      bankColumns,
      currency,
    };
    try {
      await downloadBackup(data);
      showToast('Backup exported');
    } catch (err) {
      console.error('Backup export failed', err);
      showToast('Could not export the backup.');
    }
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again later
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const parsed = parseBackup(text);
      setPending(parsed);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not read that backup file.');
    }
  }

  function confirmImport() {
    if (!pending) return;
    restoreAll(pending);
    setPending(null);
    showToast('Data restored from backup');
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" icon={<Download size={14} />} onClick={exportData} className="flex-1 px-2! py-2! text-xs">
        Export
      </Button>
      <Button
        variant="outline"
        icon={<Upload size={14} />}
        onClick={() => fileInputRef.current?.click()}
        className="flex-1 px-2! py-2! text-xs"
      >
        Import
      </Button>
      <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChosen} />

      <Modal open={pending != null} onClose={() => setPending(null)} title="Replace all your data?">
        <p className="text-sm text-ink-muted">
          This backup has {pending ? backupItemCount(pending) : 0} item{pending && backupItemCount(pending) === 1 ? '' : 's'}. Importing
          it replaces everything currently in MoneyMap — that can't be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setPending(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmImport}>
            Replace data
          </Button>
        </div>
      </Modal>
    </div>
  );
}
