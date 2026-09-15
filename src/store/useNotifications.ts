import { useEffect } from 'react';
import { useFinanceStore } from './useFinanceStore';
import { budgetWarnings } from '../lib/alerts';
import { subscriptionsDueWithin, dueInLabel } from '../lib/subscriptionDueDates';
import { formatIsoDate } from '../lib/dates';
import { currencyOf, formatCurrency } from '../lib/currency';
import { loadValue, saveValue } from '../lib/storage';

export const NOTIFICATIONS_ENABLED_KEY = 'notificationsEnabled';
const NOTIFIED_KEY = 'notifiedAlerts';

async function notify(title: string, body: string, tag: string) {
  if (!('serviceWorker' in navigator)) return;
  try {
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

/** Checks upcoming bills and budget warnings whenever the store settles
 *  into a fresh 'ready' state (initial load, and again after a poll or
 *  mutation brings in changed data) and fires an OS notification — via the
 *  service worker, so it still shows even if MoneyMap isn't the focused
 *  tab — for anything not already notified. A bill is deduped per due-date
 *  occurrence (so it nudges once, not once a day while it approaches); a
 *  budget warning is deduped per budget period (so an ongoing over-budget
 *  category nudges once a period, not daily). Does nothing unless the
 *  user has explicitly turned this on via NotificationToggle — this never
 *  prompts for permission itself. */
export function useNotifications() {
  const status = useFinanceStore((s) => s.status);
  const subscriptions = useFinanceStore((s) => s.subscriptions);
  const categories = useFinanceStore((s) => s.categories);
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useFinanceStore((s) => currencyOf(s.currency));

  useEffect(() => {
    if (status !== 'ready') return;
    if (!loadValue(NOTIFICATIONS_ENABLED_KEY, false)) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const today = new Date();
    const alreadyNotified = loadValue<Record<string, true>>(NOTIFIED_KEY, {});
    let changed = false;

    for (const { subscription, dueDate } of subscriptionsDueWithin(subscriptions, today, 3)) {
      const key = `bill:${subscription.id}:${formatIsoDate(dueDate)}`;
      if (alreadyNotified[key]) continue;
      notify(
        subscription.kind === 'bill' ? 'Bill due soon' : 'Subscription renewing soon',
        `${subscription.name} — ${formatCurrency(subscription.amount, currency)}, due ${dueInLabel(dueDate, today).toLowerCase()}`,
        key,
      );
      alreadyNotified[key] = true;
      changed = true;
    }

    for (const w of budgetWarnings(categories, transactions, today)) {
      const key = `budget:${w.category.id}:${w.periodKey}`;
      if (alreadyNotified[key]) continue;
      notify(
        w.severity === 'over' ? 'Over budget' : 'Nearing budget',
        `${w.category.name}: ${formatCurrency(w.spent, currency)} of ${formatCurrency(w.budget, currency)}`,
        key,
      );
      alreadyNotified[key] = true;
      changed = true;
    }

    if (changed) saveValue(NOTIFIED_KEY, alreadyNotified);
  }, [status, subscriptions, categories, transactions, currency]);
}
