import { useState } from 'react';
import type { FormEvent } from 'react';
import { Check, DoorOpen, LogOut, MailPlus, User, Users, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useProfileStore } from '../../store/useProfileStore';
import { Button } from './Button';
import { Field, TextInput } from './fields';
import { Modal } from './Modal';

/** Shows which ledger (Personal / a Shared one) is active; clicking it
 *  opens a panel to switch ledgers, answer sharing invitations, share a new
 *  ledger with a partner, leave a shared one, or sign out. Lives in the
 *  sidebar footer on both desktop and mobile nav. */
export function ProfileSwitcher() {
  const profiles = useProfileStore((s) => s.profiles);
  const invitations = useProfileStore((s) => s.invitations);
  const selectedProfileId = useProfileStore((s) => s.selectedProfileId);
  const selectProfile = useProfileStore((s) => s.selectProfile);
  const createShared = useProfileStore((s) => s.createShared);
  const acceptInvite = useProfileStore((s) => s.acceptInvite);
  const declineInvite = useProfileStore((s) => s.declineInvite);
  const leaveShared = useProfileStore((s) => s.leaveShared);
  const email = useAuthStore((s) => s.session?.user.email);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Shared');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  /** Which shared ledger's Leave button has been pressed once. Leaving can
   *  delete the ledger outright (if nobody else is left in it), so it takes
   *  a second press rather than firing on the first. */
  const [confirmLeaveId, setConfirmLeaveId] = useState<string | null>(null);

  const active = profiles.find((p) => p.id === selectedProfileId);

  async function handleShare(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createShared(name, partnerEmail);
      // Worded as "if they have an account" because the backend genuinely
      // doesn't tell us — saying "sent" or "no such user" here would undo
      // the point of that and turn this form into an account-finder.
      setSentTo(partnerEmail);
      setPartnerEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the shared ledger.');
    } finally {
      setBusy(false);
    }
  }

  /** Runs one of the invitation/leave actions, surfacing whatever the
   *  backend refused with (a withdrawn invitation, a ledger already left). */
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That didn’t work. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function closePanel() {
    setOpen(false);
    setError(null);
    setSentTo(null);
    setConfirmLeaveId(null);
  }

  async function handleSignOut() {
    closePanel();
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
        {invitations.length > 0 && (
          <span className="shrink-0 rounded-full bg-verdigris px-1.5 text-[10px] font-semibold text-ink-on-parchment">
            {invitations.length}
          </span>
        )}
        <span className="text-ink-faint">Switch</span>
      </button>

      <Modal open={open} onClose={closePanel} title="Ledgers">
        {email && <p className="mb-3 text-xs text-ink-muted">Signed in as {email}</p>}
        <div className="flex flex-col gap-1.5">
          {profiles.map((p) => (
            <div
              key={p.id}
              className={`flex items-center rounded-lg border transition-colors ${
                p.id === selectedProfileId
                  ? 'border-verdigris bg-panel text-ink-bright'
                  : 'border-line text-ink-muted hover:border-verdigris/40 hover:text-ink-bright'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  selectProfile(p.id);
                  closePanel();
                }}
                className="flex flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm"
              >
                {p.kind === 'shared' ? <Users size={15} /> : <User size={15} />}
                <span className="flex-1">{p.name}</span>
                {p.id === selectedProfileId && <Check size={15} className="text-verdigris" />}
              </button>
              {p.kind === 'shared' &&
                (confirmLeaveId === p.id ? (
                  <span className="flex items-center gap-1 pr-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        setConfirmLeaveId(null);
                        await run(() => leaveShared(p.id));
                      }}
                      className="rounded-md px-2 py-1 text-xs text-coral transition-colors hover:bg-coral-soft disabled:opacity-40"
                    >
                      Leave
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmLeaveId(null)}
                      className="rounded-md px-2 py-1 text-xs text-ink-faint transition-colors hover:text-ink-bright"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmLeaveId(p.id)}
                    title={`Leave ${p.name}`}
                    aria-label={`Leave ${p.name}`}
                    className="mr-1.5 rounded-md p-1.5 text-ink-faint transition-colors hover:bg-panel-high hover:text-coral"
                  >
                    <DoorOpen size={15} />
                  </button>
                ))}
            </div>
          ))}
        </div>

        {invitations.length > 0 && (
          <div className="mt-5 flex flex-col gap-2 border-t border-line pt-4">
            <p className="text-sm font-medium text-ink-bright">
              {invitations.length === 1 ? 'Sharing invitation' : 'Sharing invitations'}
            </p>
            <p className="text-xs text-ink-muted">
              Accept and you&rsquo;ll both see and edit the same data. Until you do, they can&rsquo;t see anything
              of yours.
            </p>
            {invitations.map((invite) => (
              <div key={invite.ledgerId} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5">
                <Users size={15} className="shrink-0 text-ink-faint" />
                <span className="flex-1 text-sm text-ink-bright">
                  <span className="block truncate">{invite.name}</span>
                  {invite.invitedBy && <span className="block truncate text-xs text-ink-muted">{invite.invitedBy}</span>}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => acceptInvite(invite.ledgerId))}
                  title={`Accept ${invite.name}`}
                  aria-label={`Accept ${invite.name}`}
                  className="rounded-md p-1.5 text-verdigris transition-colors hover:bg-panel-high disabled:opacity-40"
                >
                  <Check size={16} />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => declineInvite(invite.ledgerId))}
                  title={`Decline ${invite.name}`}
                  aria-label={`Decline ${invite.name}`}
                  className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-coral-soft hover:text-coral disabled:opacity-40"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleShare} className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
          <p className="text-sm font-medium text-ink-bright">Share a ledger with your partner</p>
          <p className="text-xs text-ink-muted">
            They need to have signed up to MoneyMap first, and to accept the invitation. Once they do, you&rsquo;ll
            both see and edit the same data.
          </p>
          <Field label="Ledger name">
            <TextInput required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Partner's email">
            <TextInput
              type="email"
              required
              value={partnerEmail}
              onChange={(e) => {
                setPartnerEmail(e.target.value);
                setSentTo(null);
              }}
            />
          </Field>
          {error && <p className="text-xs text-coral">{error}</p>}
          {sentTo && (
            <p className="text-xs text-ink-muted">
              Ledger created. If {sentTo} has a MoneyMap account, the invitation is waiting for them.
            </p>
          )}
          <Button type="submit" variant="outline" disabled={busy} icon={<MailPlus size={14} />}>
            {busy ? 'Creating…' : 'Create and invite'}
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
