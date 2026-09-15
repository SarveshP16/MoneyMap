import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { Logo } from './layout/Logo';
import { Button } from './ui/Button';
import { useFinanceStore } from '../store/useFinanceStore';
import { useConnectivity } from '../store/useConnectivity';
import { useSyncPolling } from '../store/useSyncPolling';

/** Blocks rendering the app until the initial load from the sync server
 *  resolves — every page already assumes real data is present in the
 *  store, so this is the one place that has to know loading/error states
 *  exist at all. Also where sync polling gets wired in, since both only
 *  make sense once there's a live connection to begin with. */
export function ConnectionGate({ children }: { children: ReactNode }) {
  const status = useFinanceStore((s) => s.status);
  const init = useFinanceStore((s) => s.init);
  useSyncPolling();
  useConnectivity();

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'ready') return children;

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
      <Logo size={32} />
      {status === 'loading' ? (
        <>
          <motion.p
            className="font-display text-lg text-ink-bright"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            Connecting to MoneyMap…
          </motion.p>
          <p className="max-w-xs text-sm text-ink-muted">Loading your data from the sync server.</p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-coral">
            <WifiOff size={18} />
            <p className="font-display text-lg">Can&rsquo;t reach the server</p>
          </div>
          <p className="max-w-xs text-sm text-ink-muted">
            MoneyMap couldn&rsquo;t load your data. Check that the server is running and this device is on the
            network that can reach it.
          </p>
          <Button onClick={init}>Try again</Button>
        </>
      )}
    </div>
  );
}
