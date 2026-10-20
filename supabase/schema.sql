-- MoneyMap's cloud backend — replaces server/index.js (Express + Postgres
-- on the Pi). Run this once in the Supabase dashboard's SQL editor.
--
-- Same data model as before: one JSON document per "ledger" (what the app
-- calls a profile), holding every collection. What's different is who can
-- see what: instead of "anyone on the tailnet picks a name", every ledger
-- has members, and Postgres row-level security only lets members read it.
-- Each user gets a private Personal ledger on first sign-in, and can create
-- Shared ledgers with a partner by email. Sharing is an invitation, not a
-- fait accompli: the partner is a member only once they accept, so nobody
-- can push a ledger into someone else's account, and either side can leave.
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
  accepted boolean not null default false,
  primary key (ledger_id, user_id)
);

-- Adding `accepted` to a database that predates invitations. Every row that
-- already exists belongs to someone who is a real member today, so the
-- column arrives defaulting to true (which back-fills them in one pass) and
-- only then flips to false for genuinely new invitations. Guarded on the
-- column's absence rather than written as a plain `add column if not exists`
-- so that re-running this file can never silently accept everyone's pending
-- invitations.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ledger_members' and column_name = 'accepted'
  ) then
    alter table public.ledger_members add column accepted boolean not null default true;
    alter table public.ledger_members alter column accepted set default false;
  end if;
end $$;

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
--
-- An unaccepted invitation is deliberately NOT membership: it grants no
-- read on the ledger, its membership list or its data, and save_ledger_state
-- rejects writes to it. So an invitation the partner never accepts stays
-- inert — the inviter cannot see anything through it, and the invitee's own
-- data never lands in it. list_ledger_invitations() is how a pending invite
-- becomes visible to the person who has to decide on it.
create or replace function public.is_ledger_member(p_ledger_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ledger_members
    where ledger_id = p_ledger_id and user_id = auth.uid() and accepted
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

  -- Accepted outright: there's nobody to invite you to your own ledger.
  insert into public.ledger_members (ledger_id, user_id, accepted)
  values (v_id, v_uid, true)
  on conflict (ledger_id, user_id) do update set accepted = true;

  return v_id;
end;
$$;

-- Creates a Shared ledger owned by the caller and invites one other user to
-- it by email. The partner has to have signed up already — there's no invite
-- email, just a lookup by address — and they join only once they accept.
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

  -- Deliberately not an error when no account matches. This function runs as
  -- its owner, so it can read auth.users, which clients otherwise can't see
  -- at all; a distinct "no such account" reply would hand every signed-in
  -- user an oracle for testing whether an address has a MoneyMap account.
  -- The ledger is created either way and the invitation simply goes to
  -- nobody, so the caller learns nothing they didn't already supply. The
  -- "your own email" check below leaks nothing — they know their own address.
  if v_partner = v_uid then
    raise exception 'That''s your own email — enter your partner''s.';
  end if;

  insert into public.ledgers (name, kind, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Shared'), 'shared', v_uid)
  returning id into v_id;

  insert into public.ledger_members (ledger_id, user_id, accepted) values (v_id, v_uid, true);
  if v_partner is not null then
    insert into public.ledger_members (ledger_id, user_id, accepted) values (v_id, v_partner, false);
  end if;

  return v_id;
end;
$$;

-- The pending invitations waiting on the caller. These ledgers aren't
-- readable through the policies above yet (that's the point of accepting),
-- so they can't come from a select on `ledgers` — hence a function, which
-- also lets it name who invited you. Deciding whether to accept is hard
-- without that, and the inviter already knew the invitee's address.
create or replace function public.list_ledger_invitations()
returns table (ledger_id uuid, name text, invited_by text)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.name, u.email::text
  from public.ledger_members m
  join public.ledgers l on l.id = m.ledger_id
  join auth.users u on u.id = l.created_by
  where m.user_id = auth.uid() and not m.accepted
  order by l.created_at;
$$;

create or replace function public.accept_ledger_invitation(p_ledger_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;

  update public.ledger_members set accepted = true
  where ledger_id = p_ledger_id and user_id = v_uid and not accepted;

  -- Also the path taken when the ledger id is simply made up, which is why
  -- the message says nothing about whether it exists.
  if not found then
    raise exception 'No pending invitation to that ledger.';
  end if;
end;
$$;

create or replace function public.decline_ledger_invitation(p_ledger_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;

  -- Only ever deletes the caller's own unaccepted row: declining leaves the
  -- inviter's ledger alone, it just stops being offered here. Nothing stops
  -- them inviting again, same as any other sharing request.
  delete from public.ledger_members
  where ledger_id = p_ledger_id and user_id = v_uid and not accepted;

  if not found then
    raise exception 'No pending invitation to that ledger.';
  end if;
end;
$$;

-- Lets a member walk away from a Shared ledger. The Personal one is excluded
-- because leaving it would leave the account with nowhere to put its data,
-- and ensure_personal_ledger() would just recreate the membership anyway.
create or replace function public.leave_ledger(p_ledger_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_kind text;
  v_remaining integer;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;

  select kind into v_kind from public.ledgers where id = p_ledger_id;
  if v_kind = 'personal' then
    raise exception 'You can''t leave your own Personal ledger.';
  end if;

  delete from public.ledger_members where ledger_id = p_ledger_id and user_id = v_uid;
  if not found then
    raise exception 'Not a member of that ledger.';
  end if;

  -- Last one out takes the ledger with them. With no members left nobody can
  -- read it ever again — is_ledger_member is false for everyone, including
  -- the original creator — so keeping the rows would orphan the data rather
  -- than preserve it. ledger_state and ledger_members cascade from ledgers.
  select count(*) into v_remaining from public.ledger_members where ledger_id = p_ledger_id;
  if v_remaining = 0 then
    delete from public.ledgers where id = p_ledger_id;
  end if;
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

-- Supabase grants execute on new functions to anon by default, so each one
-- has to be taken away explicitly before being handed to signed-in users.
revoke all on function public.ensure_personal_ledger() from public, anon;
revoke all on function public.create_shared_ledger(text, text) from public, anon;
revoke all on function public.save_ledger_state(uuid, jsonb) from public, anon;
revoke all on function public.list_ledger_invitations() from public, anon;
revoke all on function public.accept_ledger_invitation(uuid) from public, anon;
revoke all on function public.decline_ledger_invitation(uuid) from public, anon;
revoke all on function public.leave_ledger(uuid) from public, anon;
grant execute on function public.ensure_personal_ledger() to authenticated;
grant execute on function public.create_shared_ledger(text, text) to authenticated;
grant execute on function public.save_ledger_state(uuid, jsonb) to authenticated;
grant execute on function public.list_ledger_invitations() to authenticated;
grant execute on function public.accept_ledger_invitation(uuid) to authenticated;
grant execute on function public.decline_ledger_invitation(uuid) to authenticated;
grant execute on function public.leave_ledger(uuid) to authenticated;
