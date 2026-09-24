import { useEffect, useState } from 'react';
import { Toggle } from './fields';
import { loadValue, saveValue } from '../../lib/storage';
import { NOTIFICATIONS_ENABLED_KEY } from '../../store/useNotifications';
import { hasNotificationPermission, notificationsSupported, requestNotificationPermission } from '../../lib/notify';

/** The opt-in for useNotifications — never requests permission on its own;
 *  only asks when the person explicitly flips this on, and turning it back
 *  off just stops MoneyMap from notifying (there's no way to walk back an
 *  already-granted OS permission from here, only from the browser or the
 *  phone's app settings). */
export function NotificationToggle() {
  const supported = notificationsSupported();
  const [enabled, setEnabled] = useState<boolean>(() => supported && loadValue(NOTIFICATIONS_ENABLED_KEY, false));

  // Permission can be revoked outside the app (browser/phone settings), and
  // on Android it can only be checked asynchronously — so the stored opt-in
  // is shown first, then corrected if the permission's actually gone.
  useEffect(() => {
    if (!supported || !enabled) return;
    hasNotificationPermission().then((granted) => {
      if (!granted) setEnabled(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!supported) return null;

  async function handleChange(next: boolean) {
    if (next && !(await requestNotificationPermission())) return;
    setEnabled(next);
    saveValue(NOTIFICATIONS_ENABLED_KEY, next);
  }

  return (
    <Toggle
      checked={enabled}
      onChange={handleChange}
      label="Bill & budget alerts"
      description="Notify when a bill's due soon or a category's over budget"
    />
  );
}
