import { useEffect } from 'react';
import { useFinanceStore } from './useFinanceStore';

/** Bridges the browser's "online" event into an immediate retry — when
 *  Tailscale reconnects or wifi comes back, this pushes any change that
 *  queued up while offline (or pulls whatever changed elsewhere) right
 *  away, instead of waiting for the next 15s poll. There's no matching
 *  "offline" handler: isOnline is driven by actual request failures
 *  (useFinanceStore), which are the more trustworthy signal for whether
 *  *this* server is reachable — the interface can say "online" while
 *  Tailscale itself is still the thing that's down. */
export function useConnectivity() {
  const refreshFromServer = useFinanceStore((s) => s.refreshFromServer);

  useEffect(() => {
    window.addEventListener('online', refreshFromServer);
    return () => window.removeEventListener('online', refreshFromServer);
  }, [refreshFromServer]);
}
