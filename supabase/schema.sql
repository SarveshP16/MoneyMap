-- MoneyMap's cloud backend — replaces server/index.js (Express + Postgres
-- on the Pi). Run this once in the Supabase dashboard's SQL editor.
--
-- Same data model as before: one JSON document per "ledger" (what the app
-- calls a profile), holding every collection. What's different is who can
-- see what: instead of "anyone on the tailnet picks a name", every ledger
-- has members, and Postgres row-level security only lets members read it.
-- Each user gets a private Personal ledger on first sign-in, and can create
-- Shared ledgers with a partner by email.
--
-- Clients never write tables directly — all writes go through the
-- security-definer functions below, so the membership checks and the
-- merge-don't-replace rule live in one place, same as the old server.

create table if not exists public.ledgers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('personal', 'shared')),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- One Personal ledger per user, which is what makes ensure_personal_ledger()
-- safe to call concurrently from two devices signing in at once.
create unique index if not exists ledgers_one_personal_per_user
  on public.ledgers (created_by) where kind = 'personal';

create table if not exists public.ledger_members (
  ledger_id uuid not null references public.ledgers (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (ledger_id, user_id)
);

create table if not exists public.ledger_state (
  ledger_id uuid primary key references public.ledgers (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz
);

alter table public.ledgers enable row level security;
alter table public.ledger_members enable row level security;
alter table public.ledger_state enable row level security;

-- Security definer so the policies below can check membership without
-- recursing into ledger_members' own policy.
create or replace function public.is_ledger_member(p_ledger_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ledger_members
    where ledger_id = p_ledger_id and user_id = auth.uid()
  );
$$;

drop policy if exists "members read ledgers" on public.ledgers;
create policy "members read ledgers" on public.ledgers
  for select using (public.is_ledger_member(id));

drop policy if exists "members read membership" on public.ledger_members;
create policy "members read membership" on public.ledger_members
  for select using (public.is_ledger_member(ledger_id));

drop policy if exists "members read state" on public.ledger_state;
create policy "members read state" on public.ledger_state
  for select using (public.is_ledger_member(ledger_id));

-- Returns the caller's Personal ledger, creating it on first call.
create or replace function public.ensure_personal_ledger()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;

  insert into public.ledgers (name, kind, created_by)
  values ('Personal', 'personal', v_uid)
  on conflict (created_by) where kind = 'personal' do nothing;

  select id into v_id from public.ledgers where created_by = v_uid and kind = 'personal';

  insert into public.ledger_members (ledger_id, user_id)
  values (v_id, v_uid)
  on conflict do nothing;

  return v_id;
end;
$$;

-- Creates a Shared ledger with the caller and one other existing user.
-- The partner has to have signed up already — there's no invite email,
-- just a lookup by address.
create or replace function public.create_shared_ledger(p_name text, p_partner_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_partner uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;

  select id into v_partner from auth.users where lower(email) = lower(trim(p_partner_email));
  if v_partner is null then
    raise exception 'No MoneyMap account uses that email — they need to sign up first.';
  end if;
  if v_partner = v_uid then
    raise exception 'That''s your own email — enter your partner''s.';
  end if;

  insert into public.ledgers (name, kind, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Shared'), 'shared', v_uid)
  returning id into v_id;

  insert into public.ledger_members (ledger_id, user_id) values (v_id, v_uid), (v_id, v_partner);

  return v_id;
end;
$$;

-- The old PUT /api/state: merges over the current document rather than
-- replacing it wholesale, so a payload missing a key (an older client, a
-- partial import) can't wipe collections it never meant to touch. Each
-- collection present still fully replaces its own array.
create or replace function public.save_ledger_state(p_ledger_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current jsonb;
  v_patch jsonb;
  v_now timestamptz := now();
  v_next jsonb;
begin
  if not public.is_ledger_member(p_ledger_id) then
    raise exception 'Not a member of this ledger';
  end if;

  select data into v_current from public.ledger_state where ledger_id = p_ledger_id for update;

  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_patch
  from jsonb_each(p_data)
  where (key in (
          'transactions', 'categories', 'paymentMethods', 'savingsGoals', 'investments',
          'subscriptions', 'incomeRecords', 'purchases', 'carExpenses', 'bankAllocations', 'bankColumns'
        ) and jsonb_typeof(value) = 'array')
     or (key = 'currency' and jsonb_typeof(value) = 'string');

  v_next := coalesce(v_current, '{}'::jsonb) || v_patch || jsonb_build_object('updatedAt', v_now);

  insert into public.ledger_state (ledger_id, data, updated_at)
  values (p_ledger_id, v_next, v_now)
  on conflict (ledger_id) do update set data = excluded.data, updated_at = excluded.updated_at;

  return v_next;
end;
$$;

revoke all on function public.ensure_personal_ledger() from public, anon;
revoke all on function public.create_shared_ledger(text, text) from public, anon;
revoke all on function public.save_ledger_state(uuid, jsonb) from public, anon;
grant execute on function public.ensure_personal_ledger() to authenticated;
grant execute on function public.create_shared_ledger(text, text) to authenticated;
grant execute on function public.save_ledger_state(uuid, jsonb) to authenticated;
