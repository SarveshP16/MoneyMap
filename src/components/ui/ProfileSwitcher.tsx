import { useState } from 'react';
import type { FormEvent } from 'react';
import { Check, LogOut, User, Users } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useProfileStore } from '../../store/useProfileStore';
import { Button } from './Button';
import { Field, TextInput } from './fields';
import { Modal } from './Modal';

/** Shows which ledger (Personal / a Shared one) is active; clicking it
 *  opens a panel to switch ledgers, share a new one with a partner, or
 *  sign out. Lives in the sidebar footer on both desktop and mobile nav. */
export function ProfileSwitcher() {
  const profiles = useProfileStore((s) => s.profiles);
  const selectedProfileId = useProfileStore((s) => s.selectedProfileId);
  const selectProfile = useProfileStore((s) => s.selectProfile);
  const createShared = useProfileStore((s) => s.createShared);
  const email = useAuthStore((s) => s.session?.user.email);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Shared');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = profiles.find((p) => p.id === selectedProfileId);

  async function handleShare(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createShared(name, partnerEmail);
      setPartnerEmail('');
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the shared ledger.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setOpen(false);
    await signOutOfThisDevice();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-2 text-xs text-ink-muted transition-colors hover:border-verdigris/40 hover:text-ink-bright"
      >
        {active?.kind === 'shared' ? (
          <Users size={14} className="shrink-0 text-verdigris" />
        ) : (
          <User size={14} className="shrink-0 text-verdigris" />
        )}
        <span className="flex-1 truncate text-left">{active?.name ?? 'Ledger'}</span>
        <span className="text-ink-faint">Switch</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Ledgers">
        {email && <p className="mb-3 text-xs text-ink-muted">Signed in as {email}</p>}
        <div className="flex flex-col gap-1.5">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                selectProfile(p.id);
                setOpen(false);
              }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                p.id === selectedProfileId
                  ? 'border-verdigris bg-panel text-ink-bright'
                  : 'border-line text-ink-muted hover:border-verdigris/40 hover:text-ink-bright'
              }`}
            >
              {p.kind === 'shared' ? <Users size={15} /> : <User size={15} />}
              <span className="flex-1">{p.name}</span>
              {p.id === selectedProfileId && <Check size={15} className="text-verdigris" />}
            </button>
          ))}
        </div>

        <form onSubmit={handleShare} className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
          <p className="text-sm font-medium text-ink-bright">Share a ledger with your partner</p>
          <p className="text-xs text-ink-muted">
            They need to have signed up to MoneyMap first. You&rsquo;ll both see and edit the same data.
          </p>
          <Field label="Ledger name">
            <TextInput required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Partner's email">
            <TextInput type="email" required value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} />
          </Field>
          {error && <p className="text-xs text-coral">{error}</p>}
          <Button type="submit" variant="outline" disabled={busy} icon={<Users size={14} />}>
            {busy ? 'Creating…' : 'Create shared ledger'}
          </Button>
        </form>

        <div className="mt-5 flex justify-end border-t border-line pt-4">
          <Button variant="danger" icon={<LogOut size={14} />} onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </Modal>
    </>
  );
}

/** Signs out of this device and drops everything user-specific it was
 *  holding (selected ledger, cached ledger list, cached finance data), so
 *  the next account signed in here starts clean. */
async function signOutOfThisDevice() {
  useFinanceStore.getState().reset();
  useProfileStore.getState().reset();
  await useAuthStore.getState().signOut();
}
