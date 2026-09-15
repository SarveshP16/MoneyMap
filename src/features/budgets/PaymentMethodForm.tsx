import { useState } from 'react';
import { Field, TextInput, Toggle } from '../../components/ui/fields';
import { Button } from '../../components/ui/Button';
import { FormDrawer } from '../../components/ui/FormDrawer';
import { useFinanceStore } from '../../store/useFinanceStore';

export function PaymentMethodForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addPaymentMethod = useFinanceStore((s) => s.addPaymentMethod);
  const [name, setName] = useState('');
  const [isCreditCard, setIsCreditCard] = useState(false);

  // No entity to key this drawer's fields off (it's always a fresh add),
  // so resetting on close — rather than an effect on open — is enough to
  // stop a draft left over from "closed without saving" showing up next
  // time this opens.
  function close() {
    setName('');
    setIsCreditCard(false);
    onClose();
  }

  function save() {
    if (!name.trim()) return;
    addPaymentMethod({ name: name.trim(), isCreditCard });
    close();
  }

  return (
    <FormDrawer open={open} onClose={close} title="Add payment method">
      <div className="flex flex-col gap-4">
        <Field label="Name">
          <TextInput
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Debit card, Cash"
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </Field>
        <Toggle
          checked={isCreditCard}
          onChange={setIsCreditCard}
          label="This is a credit card"
          description="Expenses paid with it show a credit-card badge"
        />
        <Button onClick={save} className="mt-1 w-full">
          Add
        </Button>
      </div>
    </FormDrawer>
  );
}
