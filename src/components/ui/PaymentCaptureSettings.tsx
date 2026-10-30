import { useEffect, useState } from 'react';
import { Toggle } from './fields';
import { Button } from './Button';
import { Modal } from './Modal';
import { PaymentCapture, paymentCaptureSupported, type CaptureApp } from '../../lib/paymentCapture';
import { usePaymentCaptureStore } from '../../store/usePaymentCaptureStore';

/** The opt-in for tap-to-pay capture (Android only). Turning it on sends
 *  the user to Android's Notification access screen, the one place that
 *  access can be granted; MoneyMap only ever reads the apps picked under
 *  "Choose apps". */
export function PaymentCaptureSettings() {
  const enabled = usePaymentCaptureStore((s) => s.enabled);
  const hasAccess = usePaymentCaptureStore((s) => s.hasAccess);
  const setEnabled = usePaymentCaptureStore((s) => s.setEnabled);
  const [appsOpen, setAppsOpen] = useState(false);

  if (!paymentCaptureSupported) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <Toggle
        checked={enabled && hasAccess}
        onChange={(next) => setEnabled(next)}
        label="Capture tap-to-pay"
        description="Queue wallet and bank payment alerts for review"
      />
      {enabled && !hasAccess && (
        <div className="rounded-lg border border-line bg-ink-soft px-3 py-2.5 text-xs text-ink-muted">
          <p>
            MoneyMap needs Notification access to see payment alerts. If Android says access was denied, open App
            info, tap the ⋮ menu, choose Allow restricted settings, then open Notification access again.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <button
              onClick={() => PaymentCapture.openAccessSettings()}
              className="font-semibold text-verdigris hover:text-verdigris/80"
            >
              Open Notification access
            </button>
            <button
              onClick={() => PaymentCapture.openAppInfo()}
              className="font-semibold text-verdigris hover:text-verdigris/80"
            >
              Open App info
            </button>
          </div>
        </div>
      )}
      {enabled && hasAccess && (
        <button
          onClick={() => setAppsOpen(true)}
          className="self-start px-1 text-xs font-medium text-ink-muted hover:text-ink-bright"
        >
          Choose apps to watch
        </button>
      )}
      <WatchedAppsDialog open={appsOpen} onClose={() => setAppsOpen(false)} />
    </div>
  );
}

function WatchedAppsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [apps, setApps] = useState<CaptureApp[] | null>(null);

  useEffect(() => {
    if (!open) return;
    PaymentCapture.listApps().then(({ apps }) =>
      // Ticked first, then the wallets and banks MoneyMap knows, then everything else.
      setApps(
        [...apps].sort(
          (a, b) =>
            Number(b.watched) - Number(a.watched) ||
            Number(b.known) - Number(a.known) ||
            a.label.localeCompare(b.label),
        ),
      ),
    );
  }, [open]);

  function toggle(packageName: string) {
    if (!apps) return;
    const next = apps.map((a) => (a.packageName === packageName ? { ...a, watched: !a.watched } : a));
    setApps(next);
    PaymentCapture.setWatchedApps({ packages: next.filter((a) => a.watched).map((a) => a.packageName) });
  }

  return (
    <Modal open={open} onClose={onClose} title="Apps to watch">
      <p className="mb-3 text-sm text-ink-muted">
        Tick your wallet and banking apps. MoneyMap ignores notifications from every other app.
      </p>
      <div className="-mx-1 mb-4 max-h-72 overflow-y-auto">
        {apps == null ? (
          <p className="px-1 py-2 text-sm text-ink-faint">Loading apps…</p>
        ) : (
          apps.map((app) => (
            <label
              key={app.packageName}
              className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-2 text-sm text-ink-bright hover:bg-ink-soft"
            >
              <input
                type="checkbox"
                checked={app.watched}
                onChange={() => toggle(app.packageName)}
                className="h-4 w-4 accent-verdigris"
              />
              {app.label}
            </label>
          ))
        )}
      </div>
      <Button className="w-full" onClick={onClose}>
        Done
      </Button>
    </Modal>
  );
}
