import { useEffect } from 'react';
import { useFinanceStore } from './useFinanceStore';

const POLL_INTERVAL_MS = 15_000;

/** Keeps this device's view fresh against whatever another device last
 *  wrote — a plain interval poll while the tab is visible, plus an
 *  immediate refetch on regaining focus (the common case: you switch back
 *  from your phone to this tab and want to see what changed). Not
 *  websockets — for one person's own data on two or three devices, a
 *  15s-or-on-focus refresh is indistinguishable from "live" in practice,
 *  without a persistent connection to keep alive on a phone. */
export function useSyncPolling() {
  const refreshFromServer = useFinanceStore((s) => s.refreshFromServer);

  useEffect(() => {
    function poll() {
      if (document.visibilityState === 'visible') refreshFromServer();
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', poll);
    window.addEventListener('focus', poll);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', poll);
      window.removeEventListener('focus', poll);
    };
  }, [refreshFromServer]);
}
