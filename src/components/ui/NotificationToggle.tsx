import { useState } from 'react';
import { Toggle } from './fields';
import { loadValue, saveValue } from '../../lib/storage';
import { NOTIFICATIONS_ENABLED_KEY } from '../../store/useNotifications';

/** The opt-in for useNotifications — never requests permission on its own;
 *  only asks when the person explicitly flips this on, and turning it back
 *  off just stops MoneyMap from notifying (there's no way to walk back an
 *  already-granted OS permission from here, only from the browser itself). */
export function NotificationToggle() {
  const supported = typeof Notification !== 'undefined';
  const [enabled, setEnabled] = useState<boolean>(
    () => supported && loadValue(NOTIFICATIONS_ENABLED_KEY, false) && Notification.permission === 'granted',
  );

  if (!supported) return null;

  async function handleChange(next: boolean) {
    if (next) {
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission !== 'granted') return;
    }
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
