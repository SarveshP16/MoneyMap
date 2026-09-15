import { CalendarClock, Check } from 'lucide-react';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { dateOnly, formatIsoDate } from '../../lib/dates';
import { isLoggedForDueDate } from '../../lib/alerts';
import { dueInLabel, subscriptionsDueWithin } from '../../lib/subscriptionDueDates';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useToastStore } from '../../store/useToastStore';

/** Subscriptions/bills due within the next week — renders nothing when
 *  there's nothing due, so it's safe to drop onto both Overview and
 *  Subscriptions without adding empty chrome to either. A due date on or
 *  before today gets a one-tap "Log payment" (creates the matching
 *  transaction); anything further out is shown as a plain heads-up, since
 *  it hasn't actually happened yet. */
export function UpcomingBills() {
  const subscriptions = useFinanceStore((s) => s.subscriptions);
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const logSubscriptionPayment = useFinanceStore((s) => s.logSubscriptionPayment);
  const showToast = useToastStore((s) => s.show);

  const today = new Date();
  const due = subscriptionsDueWithin(subscriptions, today, 7);
  if (due.length === 0) return null;

  return (
    <div className="ledger-tab rounded-xl border border-line bg-panel p-4">
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock size={15} className="text-brass" />
        <h2 className="font-display text-lg font-semibold text-ink-bright">Upcoming</h2>
      </div>
      <div className="flex flex-col gap-2">
        {due.map(({ subscription, dueDate }) => {
          const logged = isLoggedForDueDate(subscription, dueDate);
          const canLog = !logged && dueDate.getTime() <= dateOnly(today).getTime();
          return (
            <div key={subscription.id} className="flex items-center justify-between gap-3 rounded-lg bg-ink-soft px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-bright">{subscription.name}</p>
                <p className="text-xs text-ink-faint">
                  {dueInLabel(dueDate, today)} · {formatCurrency(subscription.amount, currency)}
                </p>
              </div>
              {logged ? (
                <span className="flex shrink-0 items-center gap-1 text-xs text-emerald">
                  <Check size={13} /> Logged
                </span>
              ) : canLog ? (
                <button
                  type="button"
                  onClick={() => {
                    logSubscriptionPayment(subscription, formatIsoDate(dueDate));
                    showToast(`Logged "${subscription.name}"`);
                  }}
                  className="shrink-0 rounded-md bg-brass-soft px-2.5 py-1.5 text-xs font-medium text-brass transition-colors hover:brightness-110"
                >
                  Log payment
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
