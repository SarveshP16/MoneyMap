import { useEffect } from 'react';
import { useToastStore } from './useToastStore';

/** Registers public/sw.js, which is what makes MoneyMap installable and lets
 *  it boot without a connection. The service worker updates itself
 *  (skipWaiting + clients.claim), which can hand control to a new version
 *  mid-session in an already-open tab — rather than let that happen silently
 *  and risk the tab running against a mismatched shell, this nudges the user
 *  to reload instead of doing it for them. */
export function useServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // controllerchange fires both for a genuine update AND the very first
    // time this page gets claimed by a freshly-installed worker (there's no
    // earlier version to update from in that case) — only the former should
    // prompt a reload, so note whether a controller already existed first.
    const hadController = navigator.serviceWorker.controller != null;
    let reloaded = false;
    function handleControllerChange() {
      if (!hadController || reloaded) return;
      reloaded = true;
      useToastStore.getState().show('MoneyMap was updated.', {
        actionLabel: 'Reload',
        onAction: () => window.location.reload(),
      });
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    navigator.serviceWorker.register('/sw.js').catch((err: unknown) => {
      console.error('Service worker registration failed', err);
    });

    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, []);
}
