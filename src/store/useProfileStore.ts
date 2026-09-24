import { create } from 'zustand';
import { createSharedProfile, fetchProfiles, type Profile } from '../lib/api';
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
  selectedProfileId: string | null;

  /** Lists the signed-in user's ledgers and settles on one — the persisted
   *  pick if it's still one of theirs, otherwise their Personal ledger. */
  loadProfiles: () => Promise<void>;
  selectProfile: (id: string) => void;
  /** Creates a Shared ledger with a partner and switches to it. Throws with
   *  a human-readable message (e.g. partner hasn't signed up yet). */
  createShared: (name: string, partnerEmail: string) => Promise<void>;
  /** Forgets everything user-specific — on sign-out, so the next account
   *  on this device can't land in the previous one's ledger. */
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  status: 'loading',
  profiles: [],
  selectedProfileId: loadSelectedProfileId(),

  loadProfiles: async () => {
    set({ status: 'loading' });
    let profiles: Profile[];
    try {
      profiles = await fetchProfiles();
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

    const selected = get().selectedProfileId;
    const next = selected != null && profiles.some((p) => p.id === selected) ? selected : (profiles[0]?.id ?? null);
    persistSelection(next);
    set({ profiles, status: 'ready', selectedProfileId: next });
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

  reset: () => {
    persistSelection(null);
    saveValue(CACHED_PROFILES_KEY, []);
    set({ status: 'loading', profiles: [], selectedProfileId: null });
  },
}));
