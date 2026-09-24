import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  session: Session | null;

  /** Reads the persisted session and subscribes to future changes (token
   *  refresh, sign-out elsewhere). Call once at startup. */
  init: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  /** Resolves to true when Supabase wants the address confirmed first
   *  (the project's "Confirm email" setting) — there's no session yet in
   *  that case, so the UI has to say "check your inbox". */
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

let initialized = false;

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  session: null,

  init: () => {
    if (initialized) return;
    initialized = true;
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, status: data.session ? 'signedIn' : 'signedOut' });
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, status: session ? 'signedIn' : 'signedOut' });
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return { needsConfirmation: data.session == null };
  },

  signOut: async () => {
    // scope 'local' so an expired/offline session can still sign out of
    // this device without needing the server to acknowledge it.
    await supabase.auth.signOut({ scope: 'local' });
  },
}));
