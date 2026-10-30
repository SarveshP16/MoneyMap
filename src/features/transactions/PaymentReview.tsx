import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { Select } from '../../components/ui/fields';
import { Button } from '../../components/ui/Button';
import { currencyOf, formatCurrency } from '../../lib/currency';
import { dateOnly, daysBetween, formatRelativeDate } from '../../lib/dates';
import { loadValue, saveValue } from '../../lib/storage';
import { EMPTY_RULES, rememberChoice, suggestFor, type CaptureRules, type PendingPayment } from '../../lib/paymentParsing';
import { useFinanceStore } from '../../store/useFinanceStore';
import { captureRulesKey, usePaymentCaptureStore } from '../../store/usePaymentCaptureStore';
import { useProfileStore } from '../../store/useProfileStore';
import { useToastStore } from '../../store/useToastStore';

const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

/** Payments picked up from the phone's wallet and bank notifications,
 *  waiting for a yes or no before they count as expenses. Renders nothing
 *  outside the Android app or when the queue is empty. */
export function PaymentReview() {
  const payments = usePaymentCaptureStore((s) => s.payments);
  const profileId = useFinanceStore((s) => s.profileId);
  const ledgerName = useProfileStore((s) => s.profiles.find((p) => p.id === s.selectedProfileId)?.name);

  if (payments.length === 0 || !profileId) return null;

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-ink-bright">
          To review <span className="figure-sans text-ink-muted">({payments.length})</span>
        </h2>
        {ledgerName && <span className="truncate text-xs text-ink-faint">Adds to {ledgerName}</span>}
      </div>
      <div className="flex flex-col gap-2">
        {payments.map((p) => (
          <ReviewCard key={p.ids[0]} payment={p} profileId={profileId} />
        ))}
      </div>
    </section>
  );
}

function ReviewCard({ payment, profileId }: { payment: PendingPayment; profileId: string }) {
  const currency = useFinanceStore((s) => currencyOf(s.currency));
  const categories = useFinanceStore((s) => s.categories);
  const paymentMethods = useFinanceStore((s) => s.paymentMethods);
  const transactions = useFinanceStore((s) => s.transactions);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const deleteTransaction = useFinanceStore((s) => s.deleteTransaction);
  const resolve = usePaymentCaptureStore((s) => s.resolve);
  const showToast = useToastStore((s) => s.show);

  const [suggestion] = useState(() =>
    suggestFor(
      payment,
      loadValue<CaptureRules>(captureRulesKey(profileId), EMPTY_RULES),
      categories.map((c) => c.id),
      paymentMethods,
    ),
  );
  const [categoryId, setCategoryId] = useState(suggestion.categoryId);
  const [paymentMethodId, setPaymentMethodId] = useState(suggestion.paymentMethodId);

  const posted = new Date(payment.postedAt);
  // A manual entry for the same amount within a day either side is most
  // likely this payment, added by hand before the review got to it.
  const maybeDuplicate = transactions.some(
    (t) =>
      Math.round(t.amount * 100) === Math.round(payment.amount * 100) &&
      Math.abs(daysBetween(dateOnly(new Date(t.date)), dateOnly(posted))) <= 1,
  );

  const title = payment.merchant ?? 'Card payment';
  const source = [payment.appName, payment.cardLast4 && `card ••${payment.cardLast4}`].filter(Boolean).join(', ');

  function add() {
    addTransaction({
      name: payment.merchant,
      date: dateOnly(posted).toISOString(),
      amount: payment.amount,
      categoryId: categoryId || undefined,
      paymentMethodId: paymentMethodId || undefined,
      splitPaidBack: false,
      movedToCreditCard: false,
    });
    const rules = loadValue<CaptureRules>(captureRulesKey(profileId), EMPTY_RULES);
    saveValue(captureRulesKey(profileId), rememberChoice(rules, payment, categoryId, paymentMethodId));
    resolve(payment);

    const added = useFinanceStore.getState().transactions.at(-1);
    showToast(`Added "${title}"`, {
      actionLabel: 'Undo',
      onAction: () => {
        if (added) deleteTransaction(added.id);
      },
    });
  }

  return (
    <div className="rounded-lg border border-line bg-panel px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-bright">{title}</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-faint">
            <Smartphone size={12} className="shrink-0" />
            <span className="truncate">
              {formatRelativeDate(posted)}, {timeFormat.format(posted)} from {source}
            </span>
          </p>
        </div>
        <span className="figure-sans shrink-0 text-sm font-semibold text-ink-bright">
          {formatCurrency(payment.amount, currency)}
        </span>
      </div>

      {maybeDuplicate && (
        <p className="mt-2 rounded-md bg-brass-soft px-2.5 py-1.5 text-xs text-ink-bright">
          You may have added this already: there's an expense of the same amount around this date.
        </p>
      )}

      {(categories.length > 0 || paymentMethods.length > 0) && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {categories.length > 0 && (
            <Select value={categoryId} onChange={setCategoryId}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
          {paymentMethods.length > 0 && (
            <Select value={paymentMethodId} onChange={setPaymentMethodId}>
              <option value="">No payment method</option>
              {paymentMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" className="!py-2" onClick={() => resolve(payment)}>
          Dismiss
        </Button>
        <Button className="!py-2" onClick={add}>
          Add expense
        </Button>
      </div>
    </div>
  );
}
