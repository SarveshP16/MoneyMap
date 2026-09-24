// OS notifications on both platforms. The web goes through the service
// worker (so they show even when MoneyMap isn't the focused tab); the
// Android app has no service worker and no Notification API inside its
// WebView, so it uses Capacitor's LocalNotifications plugin instead.

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const isNative = Capacitor.isNativePlatform();

export function notificationsSupported(): boolean {
  return isNative || typeof Notification !== 'undefined';
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (isNative) return (await LocalNotifications.checkPermissions()).display === 'granted';
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNative) return (await LocalNotifications.requestPermissions()).display === 'granted';
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  return (await Notification.requestPermission()) === 'granted';
}

/** LocalNotifications wants a 32-bit int id; the dedupe tag (e.g.
 *  "bill:<id>:<date>") is hashed into one so the same alert replaces
 *  itself rather than stacking. */
function tagToId(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

export async function showNotification(title: string, body: string, tag: string): Promise<void> {
  try {
    if (isNative) {
      await LocalNotifications.schedule({ notifications: [{ id: tagToId(tag), title, body }] });
      return;
    }
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    });
  } catch (err) {
    console.error('Failed to show notification', err);
  }
}
