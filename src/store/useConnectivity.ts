import { useEffect } from 'react';
import { useFinanceStore } from './useFinanceStore';

/** Bridges the browser's "online" event into an immediate retry — when
 *  mobile data or wifi comes back, this pushes any change that
 *  queued up while offline (or pulls whatever changed elsewhere) right
 *  away, instead of waiting for the next 15s poll. There's no matching
 *  "offline" handler: isOnline is driven by actual request failures
 *  (useFinanceStore), which are the more trustworthy signal for whether
 *  *this* backend is reachable — the interface can say "online" while
 *  the actual route to it (captive portal, flaky network) is still down. */
export function useConnectivity() {
  const refreshFromServer = useFinanceStore((s) => s.refreshFromServer);

  useEffect(() => {
    window.addEventListener('online', refreshFromServer);
    return () => window.removeEventListener('online', refreshFromServer);
  }, [refreshFromServer]);
}
