import { useEffect } from 'react';
import { create } from 'zustand';
import { PaymentCapture, paymentCaptureSupported } from '../lib/paymentCapture';
import { groupCaptures, type PendingPayment } from '../lib/paymentParsing';

/** Where a ledger's remembered review choices (CaptureRules) are kept on
 *  this device — per ledger, since category and payment method ids belong
 *  to one ledger. */
export function captureRulesKey(profileId: string): string {
  return `captureRules.${profileId}`;
}

interface PaymentCaptureState {
  /** Turned on in MoneyMap (the native flag), whether or not Android access was granted. */
  enabled: boolean;
  /** Android's Notification access for MoneyMap — granted only in system settings. */
  hasAccess: boolean;
  /** Payments waiting for review, newest first. They live in the native
   *  queue until resolved, so nothing is lost if the app closes mid-review. */
  payments: PendingPayment[];

  refresh: () => Promise<void>;
  /** Turning on sends the user to Android's Notification access screen if
   *  MoneyMap doesn't have it yet; `refresh` picks up the answer on return. */
  setEnabled: (enabled: boolean) => Promise<void>;
  /** Clears a reviewed payment (added or dismissed) from the queue. */
  resolve: (payment: PendingPayment) => Promise<void>;
}

export const usePaymentCaptureStore = create<PaymentCaptureState>((set, get) => ({
  enabled: false,
  hasAccess: false,
  payments: [],

  refresh: async () => {
    if (!paymentCaptureSupported) return;
    try {
      const [status, pending] = await Promise.all([PaymentCapture.getStatus(), PaymentCapture.getPending()]);
      const { payments, skipped } = groupCaptures(pending.captures);
      if (skipped.length > 0) await PaymentCapture.acknowledge({ ids: skipped });
      set({ enabled: status.enabled, hasAccess: status.hasAccess, payments });
    } catch (err) {
      console.error('Failed to read captured payments', err);
    }
  },

  setEnabled: async (enabled) => {
    if (!paymentCaptureSupported) return;
    await PaymentCapture.setEnabled({ enabled });
    set({ enabled });
    if (enabled && !get().hasAccess) await PaymentCapture.openAccessSettings();
  },

  resolve: async (payment) => {
    set({ payments: get().payments.filter((p) => p !== payment) });
    try {
      await PaymentCapture.acknowledge({ ids: payment.ids });
    } catch (err) {
      console.error('Failed to clear captured payment', err);
    }
  },
}));

/** Keeps the review list current: on launch, when a payment is captured
 *  while the app is open, and on resume (back from a payment, or from
 *  granting Notification access). */
export function usePaymentCaptureSync() {
  const refresh = usePaymentCaptureStore((s) => s.refresh);

  useEffect(() => {
    if (!paymentCaptureSupported) return;
    refresh();
    const handle = PaymentCapture.addListener('changed', () => {
      refresh();
    });
    return () => {
      handle.then((h) => h.remove());
    };
  }, [refresh]);
}
