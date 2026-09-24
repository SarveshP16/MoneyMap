import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { FormEvent, ReactNode } from 'react';
import { Logo } from './layout/Logo';
import { Button } from './ui/Button';
import { Field, TextInput } from './ui/fields';
import { useAuthStore } from '../store/useAuthStore';
import { isSupabaseConfigured } from '../lib/supabase';

/** The front door — email + password against Supabase Auth. Everything
 *  past this (ProfileGate, ConnectionGate) assumes a signed-in session,
 *  since row-level security won't return any data without one. */
export function AuthGate({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    if (isSupabaseConfigured) init();
  }, [init]);

  if (!isSupabaseConfigured) {
    return (
      <Screen>
        <p className="font-display text-lg text-ink-bright">MoneyMap isn&rsquo;t configured</p>
        <p className="max-w-sm text-sm text-ink-muted">
          This build has no Supabase project set. Copy <code>.env.example</code> to <code>.env.local</code>, fill in
          your project&rsquo;s URL and anon key, then rebuild.
        </p>
      </Screen>
    );
  }

  if (status === 'loading') {
    return (
      <Screen>
        <motion.p
          className="font-display text-lg text-ink-bright"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          Opening MoneyMap…
        </motion.p>
      </Screen>
    );
  }

  if (status === 'signedOut') return <SignInForm />;

  return children;
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
      <Logo size={32} />
      {children}
    </div>
  );
}

function SignInForm() {
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'signIn') {
        await signIn(email.trim(), password);
      } else {
        const { needsConfirmation } = await signUp(email.trim(), password);
        if (needsConfirmation) {
          setNotice('Check your inbox to confirm your email, then sign in.');
          setMode('signIn');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <p className="font-display text-lg text-ink-bright">{mode === 'signIn' ? 'Sign in' : 'Create your account'}</p>
      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3 text-left">
        <Field label="Email">
          <TextInput
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <TextInput
            type="password"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <p className="text-xs text-coral">{error}</p>}
        {notice && <p className="text-xs text-verdigris">{notice}</p>}
        <Button type="submit" disabled={busy} className="mt-1">
          {busy ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Sign up'}
        </Button>
      </form>
      <button
        type="button"
        onClick={() => {
          setMode(mode === 'signIn' ? 'signUp' : 'signIn');
          setError(null);
        }}
        className="text-xs text-ink-muted hover:text-ink-bright"
      >
        {mode === 'signIn' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
    </Screen>
  );
}
