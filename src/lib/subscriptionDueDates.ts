// Ported from subscription_due_dates.dart.

import type { Subscription } from './types';
import { addDays, clampedDayOfMonth, dateOnly, daysBetween, isAfter, isBefore } from './dates';

function monthlyOnOrAfter(start: Date, from: Date): Date {
  if (isAfter(start, from)) return start;
  let candidate = clampedDayOfMonth(from.getFullYear(), from.getMonth(), start.getDate());
  if (isBefore(candidate, from)) {
    const nextMonth = new Date(from.getFullYear(), from.getMonth() + 1, 1);
    candidate = clampedDayOfMonth(nextMonth.getFullYear(), nextMonth.getMonth(), start.getDate());
  }
  return candidate;
}

function yearlyOnOrAfter(start: Date, from: Date): Date {
  if (isAfter(start, from)) return start;
  let candidate = clampedDayOfMonth(from.getFullYear(), start.getMonth(), start.getDate());
  if (isBefore(candidate, from)) {
    candidate = clampedDayOfMonth(from.getFullYear() + 1, start.getMonth(), start.getDate());
  }
  return candidate;
}

/** The next date on/after `from` that `subscription` is due, projected
 *  forward from its startDate at its billingCycle — null if it has no
 *  start date to project from, or its endDate has already passed `from`. */
export function nextDueDate(subscription: Subscription, from: Date): Date | null {
  if (!subscription.startDate) return null;

  const fromDateOnly = dateOnly(from);
  const startDateOnly = dateOnly(new Date(subscription.startDate));

  const endDateOnly = subscription.endDate ? dateOnly(new Date(subscription.endDate)) : null;
  if (endDateOnly != null && isBefore(endDateOnly, fromDateOnly)) return null;

  let candidate: Date;
  switch (subscription.billingCycle) {
    case 'weekly':
    case 'fortnightly': {
      const cycleDays = subscription.billingCycle === 'weekly' ? 7 : 14;
      let cur = startDateOnly;
      if (isBefore(cur, fromDateOnly)) {
        // Jump straight to the neighborhood of `from` via integer division
        // instead of looping one cycle at a time.
        const gapDays = daysBetween(cur, fromDateOnly);
        cur = addDays(cur, Math.floor(gapDays / cycleDays) * cycleDays);
        while (isBefore(cur, fromDateOnly)) {
          cur = addDays(cur, cycleDays);
        }
      }
      candidate = cur;
      break;
    }
    case 'monthly':
      candidate = monthlyOnOrAfter(startDateOnly, fromDateOnly);
      break;
    case 'yearly':
      candidate = yearlyOnOrAfter(startDateOnly, fromDateOnly);
      break;
  }

  if (endDateOnly != null && isAfter(candidate, endDateOnly)) return null;
  return candidate;
}

export interface DueSubscription {
  subscription: Subscription;
  dueDate: Date;
}

/** Every subscription/bill in `items` next due within `days` days of `from`
 *  (inclusive of today), soonest first. Items with no startDate are left out. */
export function subscriptionsDueWithin(
  items: Subscription[],
  from: Date,
  days = 7,
): DueSubscription[] {
  const fromDateOnly = dateOnly(from);
  const horizon = addDays(fromDateOnly, days - 1);

  const due: DueSubscription[] = [];
  for (const item of items) {
    const dueDate = nextDueDate(item, fromDateOnly);
    if (dueDate == null) continue;
    if (isAfter(dueDate, horizon)) continue;
    due.push({ subscription: item, dueDate });
  }

  due.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return due;
}

/** A short "Today" / "Tomorrow" / "in N days" label for `dueDate` relative
 *  to `from` — `dueDate` is assumed already date-only and on/after `from`. */
export function dueInLabel(dueDate: Date, from: Date): string {
  const days = daysBetween(dateOnly(from), dueDate);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
}
