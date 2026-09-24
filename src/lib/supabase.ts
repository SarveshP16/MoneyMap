// The one Supabase client — auth session and every data call go through
// this. Configured at build time from .env.local (see .env.example); the
// anon key is safe to ship in the bundle, row-level security in
// supabase/schema.sql is what actually guards the data.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** False when the build was made without Supabase credentials — AuthGate
 *  shows a setup message instead of a sign-in form that could never work. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // No OAuth/magic-link redirects to parse — sign-in is email + password.
    detectSessionInUrl: false,
  },
});
