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

export async function createSharedProfile(name: string, partnerEmail: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_shared_ledger', { p_name: name, p_partner_email: partnerEmail });
  if (error) throw error;
  return data as string;
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
