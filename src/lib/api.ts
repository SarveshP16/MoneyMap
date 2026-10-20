// Data client for the Supabase backend (supabase/schema.sql). A "profile"
// in the UI is a ledger row: the signed-in user's Personal one, plus any
// Shared ones they're a member of. Row-level security means these queries
// only ever see ledgers the user belongs to.

import type { FinanceBackupData } from '../store/useFinanceStore';
import { supabase } from './supabase';

export interface Profile {
  id: string;
  name: string;
  kind: 'personal' | 'shared';
}

/** A Shared ledger someone has invited this user to and they haven't
 *  answered yet. Not a Profile: until it's accepted there's no membership,
 *  so none of its data is readable and it can't be switched into. */
export interface Invitation {
  ledgerId: string;
  name: string;
  invitedBy: string | null;
}

export interface ServerState extends FinanceBackupData {
  updatedAt: string | null;
}

const DEFAULT_STATE: FinanceBackupData = {
  transactions: [],
  categories: [],
  paymentMethods: [],
  savingsGoals: [],
  investments: [],
  subscriptions: [],
  incomeRecords: [],
  purchases: [],
  carExpenses: [],
  bankAllocations: [],
  bankColumns: [],
  currency: 'usd',
};

/** Makes sure the user's Personal ledger exists, then lists every ledger
 *  they can see — Personal first, then Shared ones oldest-first. */
export async function fetchProfiles(): Promise<Profile[]> {
  const ensured = await supabase.rpc('ensure_personal_ledger');
  if (ensured.error) throw ensured.error;

  const { data, error } = await supabase.from('ledgers').select('id, name, kind, created_at').order('created_at');
  if (error) throw error;
  return (data as (Profile & { created_at: string })[])
    .map(({ id, name, kind }) => ({ id, name, kind }))
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'personal' ? -1 : 1));
}

/** Creates a Shared ledger and invites a partner to it. Succeeds whether or
 *  not that address has a MoneyMap account — the backend won't say, since
 *  that would make this a way to probe who's signed up — so the caller can't
 *  report "sent" or "no such user" either. */
export async function createSharedProfile(name: string, partnerEmail: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_shared_ledger', { p_name: name, p_partner_email: partnerEmail });
  if (error) throw error;
  return data as string;
}

/** Pending invitations waiting on this user. Comes from an RPC rather than a
 *  table select because the invited ledgers aren't readable until accepted. */
export async function fetchInvitations(): Promise<Invitation[]> {
  const { data, error } = await supabase.rpc('list_ledger_invitations');
  if (error) throw error;
  return (data as { ledger_id: string; name: string; invited_by: string | null }[]).map((row) => ({
    ledgerId: row.ledger_id,
    name: row.name,
    invitedBy: row.invited_by,
  }));
}

export async function acceptInvitation(ledgerId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_ledger_invitation', { p_ledger_id: ledgerId });
  if (error) throw error;
}

export async function declineInvitation(ledgerId: string): Promise<void> {
  const { error } = await supabase.rpc('decline_ledger_invitation', { p_ledger_id: ledgerId });
  if (error) throw error;
}

/** Removes this user from a Shared ledger. If they were the last member the
 *  ledger and its data go with them — nobody could have read it again. */
export async function leaveProfile(ledgerId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_ledger', { p_ledger_id: ledgerId });
  if (error) throw error;
}

export async function fetchState(profileId: string): Promise<ServerState> {
  const { data, error } = await supabase.from('ledger_state').select('data').eq('ledger_id', profileId).maybeSingle();
  if (error) throw error;
  if (!data) return { ...DEFAULT_STATE, updatedAt: null };
  return { ...DEFAULT_STATE, updatedAt: null, ...(data.data as Partial<ServerState>) };
}

export async function pushState(profileId: string, state: FinanceBackupData): Promise<ServerState> {
  const { data, error } = await supabase.rpc('save_ledger_state', { p_ledger_id: profileId, p_data: state });
  if (error) throw error;
  return { ...DEFAULT_STATE, ...(data as Partial<ServerState>) } as ServerState;
}
