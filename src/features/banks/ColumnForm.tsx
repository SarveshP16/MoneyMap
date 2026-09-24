import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Field, Segmented, TextInput } from '../../components/ui/fields';
import { Modal } from '../../components/ui/Modal';
import { BANK_COLUMN_KINDS, bankColumnKindLabel, type BankColumnKind } from '../../lib/types';
import { useFinanceStore } from '../../store/useFinanceStore';

// The form lives in its own component because Modal only renders its
// children while open — so this remounts, blank, on every open, with no
// reset-on-open effect needed.
function ColumnFormBody({ onClose }: { onClose: () => void }) {
  const addBankColumn = useFinanceStore((s) => s.addBankColumn);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<BankColumnKind>('text');

  function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addBankColumn({ name: name.trim(), kind });
    onClose();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <Field label="Column name">
        <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Due day, Account no." />
      </Field>
      <Field label="Type">
        <Segmented value={kind} options={BANK_COLUMN_KINDS} labels={bankColumnKindLabel} onChange={setKind} />
      </Field>
      <p className="-mt-1 text-xs text-ink-faint">
        {kind === 'number' ? 'Number columns get a total at the bottom of the table.' : 'Free text, for anything you want to note per row.'}
      </p>
      <Button type="submit" disabled={!name.trim()} className="w-full">
        Add column
      </Button>
    </form>
  );
}

export function ColumnForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Add column">
      <ColumnFormBody onClose={onClose} />
    </Modal>
  );
}
