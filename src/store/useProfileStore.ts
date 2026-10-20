import { create } from 'zustand';
import {
  acceptInvitation,
  createSharedProfile,
  declineInvitation,
  fetchInvitations,
  fetchProfiles,
  leaveProfile,
  type Invitation,
  type Profile,
} from '../lib/api';
import { loadValue, saveValue } from '../lib/storage';

// Deliberately outside the `moneymap.finance.` prefix used by lib/storage.ts
// — this is a device preference (which ledger this device opens into),
// not finance data, same distinction useThemeStore already makes.
const KEY = 'moneymap.profile';
/** Last-fetched ledger list, so a signed-in device can still open offline. */
const CACHED_PROFILES_KEY = 'cachedProfiles';

function loadSelectedProfileId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function persistSelection(id: string | null) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

interface ProfileState {
  status: 'loading' | 'ready' | 'error';
  profiles: Profile[];
  /** Shared ledgers this user has been invited to but hasn't answered. Kept
   *  apart from `profiles` because they aren't selectable: there's no
   *  membership behind them until they're accepted. */
  invitations: Invitation[];
  selectedProfileId: string | null;

  /** Lists the signed-in user's ledgers and settles on one — the persisted
   *  pick if it's still one of theirs, otherwise their Personal ledger. */
  loadProfiles: () => Promise<void>;
  selectProfile: (id: string) => void;
  /** Creates a Shared ledger, invites a partner to it, and switches to it.
   *  The partner sees it only once they accept, so it starts out as just
   *  the caller's own empty ledger. */
  createShared: (name: string, partnerEmail: string) => Promise<void>;
  /** Joins an invited ledger. Doesn't switch into it — accepting is an
   *  answer to "may they share with you", not a request to go there now,
   *  and swapping the visible data out mid-session would be a surprise. */
  acceptInvite: (ledgerId: string) => Promise<void>;
  declineInvite: (ledgerId: string) => Promise<void>;
  /** Leaves a Shared ledger, falling back to the Personal one if it was the
   *  one on screen. */
  leaveShared: (ledgerId: string) => Promise<void>;
  /** Forgets everything user-specific — on sign-out, so the next account
   *  on this device can't land in the previous one's ledger. */
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  status: 'loading',
  profiles: [],
  invitations: [],
  selectedProfileId: loadSelectedProfileId(),

  loadProfiles: async () => {
    set({ status: 'loading' });
    let profiles: Profile[];
    // Never cached: an invitation is something to act on, and a stale one
    // offered offline would only fail the moment it was answered.
    let invitations: Invitation[] = [];
    try {
      [profiles, invitations] = await Promise.all([fetchProfiles(), fetchInvitations()]);
      saveValue(CACHED_PROFILES_KEY, profiles);
    } catch (err) {
      console.error('Failed to load profiles', err);
      const cached = loadValue<Profile[]>(CACHED_PROFILES_KEY, []);
      if (cached.length === 0) {
        set({ status: 'error' });
        return;
      }
      profiles = cached;
    }

    // Only ever settles on something from `profiles`, so a pending
    // invitation can't become the open ledger on its own.
    const selected = get().selectedProfileId;
    const next = selected != null && profiles.some((p) => p.id === selected) ? selected : (profiles[0]?.id ?? null);
    persistSelection(next);
    set({ profiles, invitations, status: 'ready', selectedProfileId: next });
  },

  selectProfile: (id) => {
    persistSelection(id);
    set({ selectedProfileId: id });
  },

  createShared: async (name, partnerEmail) => {
    const id = await createSharedProfile(name, partnerEmail);
    await get().loadProfiles();
    get().selectProfile(id);
  },

  acceptInvite: async (ledgerId) => {
    await acceptInvitation(ledgerId);
    await get().loadProfiles();
  },

  declineInvite: async (ledgerId) => {
    await declineInvitation(ledgerId);
    await get().loadProfiles();
  },

  leaveShared: async (ledgerId) => {
    await leaveProfile(ledgerId);
    // Drop the selection first if it was the ledger being left, so
    // loadProfiles settles on the Personal one instead of trying to keep a
    // pick that no longer resolves.
    if (get().selectedProfileId === ledgerId) {
      persistSelection(null);
      set({ selectedProfileId: null });
    }
    await get().loadProfiles();
  },

  reset: () => {
    persistSelection(null);
    saveValue(CACHED_PROFILES_KEY, []);
    set({ status: 'loading', profiles: [], invitations: [], selectedProfileId: null });
  },
}));
