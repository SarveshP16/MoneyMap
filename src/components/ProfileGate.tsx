import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Logo } from './layout/Logo';
import { Button } from './ui/Button';
import { useAuthStore } from '../store/useAuthStore';
import { useProfileStore } from '../store/useProfileStore';

/** Loads the signed-in user's ledgers (Personal + any Shared) and settles on
 *  one before rendering ConnectionGate, which needs a ledger id to know
 *  which data to load. Switching between ledgers happens later, from
 *  ProfileSwitcher. Only rendered inside AuthGate, so there's always a
 *  session here. */
export function ProfileGate({ children }: { children: ReactNode }) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const status = useProfileStore((s) => s.status);
  const selectedProfileId = useProfileStore((s) => s.selectedProfileId);
  const loadProfiles = useProfileStore((s) => s.loadProfiles);

  useEffect(() => {
    if (userId) loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (status === 'ready' && selectedProfileId != null) return children;

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
      <Logo size={32} />
      {status === 'error' ? (
        <>
          <p className="max-w-xs text-sm text-ink-muted">
            Couldn&rsquo;t load your MoneyMap data. Check your internet connection and try again.
          </p>
          <Button onClick={loadProfiles}>Try again</Button>
        </>
      ) : (
        <motion.p
          className="font-display text-lg text-ink-bright"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          Loading your ledgers…
        </motion.p>
      )}
    </div>
  );
}
