import { CloudOff, RefreshCw } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';

/** Quiet by default — renders nothing once everything's synced, so it never
 *  competes with the rest of the sidebar. Only speaks up for the two states
 *  worth knowing about: no connection to the server right now (you're still
 *  looking at your last-synced data), or a local change that couldn't be
 *  pushed yet and is waiting to retry. */
export function SyncStatusIndicator({ compact = false }: { compact?: boolean }) {
  const isOnline = useFinanceStore((s) => s.isOnline);
  const pendingSync = useFinanceStore((s) => s.pendingSync);

  if (isOnline && !pendingSync) return null;

  const Icon = pendingSync ? RefreshCw : CloudOff;
  const label = pendingSync ? 'Unsynced changes' : 'Offline — showing saved data';

  if (compact) {
    return (
      <span title={label} className="flex items-center text-coral">
        <Icon size={16} className={pendingSync ? 'animate-spin' : undefined} />
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-coral-soft bg-coral-soft/40 px-3 py-2 text-xs text-coral">
      <Icon size={14} className={pendingSync ? 'shrink-0 animate-spin' : 'shrink-0'} />
      <span>{label}</span>
    </div>
  );
}
