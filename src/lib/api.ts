// Client for the sync backend (server/index.js) — same-origin via nginx's
// /api proxy, so this works identically whether you're on the laptop or
// reaching the container over Tailscale from your phone; there's exactly
// one address either device ever needs to know, whatever it is.

import type { FinanceBackupData } from '../store/useFinanceStore';

export interface ServerState extends FinanceBackupData {
  updatedAt: string | null;
}

export async function fetchState(): Promise<ServerState> {
  const res = await fetch('/api/state');
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  return res.json();
}

export async function pushState(data: FinanceBackupData): Promise<ServerState> {
  const res = await fetch('/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  return res.json();
}
