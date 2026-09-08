-- AETHORA P2.0 — Friends & Chat (corrected)
--
-- Root cause of ERROR 42P01 ("relation public.profiles does not exist"):
-- this database was never provisioned with a profiles table — its real
-- tables are quest_completions, reward_history, trial_completions,
-- game_states, inventory, achievement_unlocks (plus character_stats).
-- User identity (display name) therefore lives only on auth.users.
--
-- Client-readable identity is still required for friend codes (a browser
-- cannot query auth.users raw_user_meta_data), so this migration now
-- CREATES the profiles table when it is missing (idempotent: a no-op where
-- it already exists), backfills it from auth.users, and only then adds the
-- friend_code column and the friends/chat tables.
--
-- Every statement is idempotent: safe to re-apply.

-- ===========================================================================
-- 1. profiles — the user directory used for friend-code lookups
-- ===========================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  friend_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pre-existing profiles tables without the column get it added.
alter table public.profiles
  add column if not exists friend_code text;

-- Backfill: one profile row per auth user (display name from signup
-- metadata/email) and a unique friend code for everyone, with a retry loop
-- so 4-character code collisions cannot break the backfill.
do $$
declare
  u record;
  new_code text;
  attempts int;
begin
  for u in
    select us.id,
           coalesce(
             nullif(us.raw_user_meta_data ->> 'full_name', ''),
             split_part(us.email, '@', 1)
           ) as display_name
    from auth.users us
  loop
    insert into public.profiles (id, display_name)
    values (u.id, u.display_name)
    on conflict (id) do nothing;

    if not exists (
      select 1 from public.profiles p where p.id = u.id and p.friend_code is not null
    ) then
      attempts := 0;
      loop
        new_code := 'AETH-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 4));
        begin
          update public.profiles
          set friend_code = new_code
          where id = u.id and friend_code is null;
          exit;
        exception when unique_violation then
          attempts := attempts + 1;
          if attempts > 20 then
            -- Astronomically unlikely; widen the code so backfill never stalls.
            new_code := 'AETH-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));
            update public.profiles
            set friend_code = new_code
            where id = u.id and friend_code is null;
            exit;
          end if;
        end;
      end loop;
    end if;
  end loop;
end;
$$;

-- Unique index for fast code lookups (NULLs are distinct, so rows pending a
-- code never collide; the backfill above leaves none).
create unique index if not exists profiles_friend_code_idx
  on public.profiles(friend_code);

alter table public.profiles
  alter column friend_code set not null;

-- ===========================================================================
-- 2. Friend requests table
-- ===========================================================================

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (sender_id, receiver_id)
);

create index if not exists friend_requests_receiver_idx on public.friend_requests(receiver_id, status);
create index if not exists friend_requests_sender_idx on public.friend_requests(sender_id, status);

-- ===========================================================================
-- 3. Friendships table (bidirectional, ordered pair)
-- ===========================================================================

create table if not exists public.friendships (
  user_id_1 uuid not null references auth.users(id) on delete cascade,
  user_id_2 uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id_1, user_id_2),
  check (user_id_1 < user_id_2)
);

create index if not exists friendships_user1_idx on public.friendships(user_id_1);
create index if not exists friendships_user2_idx on public.friendships(user_id_2);

-- ===========================================================================
-- 4. Messages table
-- ===========================================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (length(content) > 0 and length(content) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages(sender_id, recipient_id, created_at desc);
create index if not exists messages_recipient_idx on public.messages(recipient_id, created_at desc);

-- ===========================================================================
-- 5. Enable RLS on all social tables
-- ===========================================================================

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.messages enable row level security;

-- ===========================================================================
-- 6. RLS policies
-- ===========================================================================

-- profiles: friend codes are a shared directory. Authenticated users can READ
-- every profile (otherwise "add by code" and friends lists can never resolve
-- other warriors), but may only modify their own row. No emails live here.
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists profiles_read_all on public.profiles;
create policy profiles_read_all on public.profiles
  for select to authenticated
  using (true);

-- friend_requests: visible only to sender + receiver.
drop policy if exists friend_requests_select on public.friend_requests;
create policy friend_requests_select on public.friend_requests
  for select to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id);

drop policy if exists friend_requests_insert on public.friend_requests;
create policy friend_requests_insert on public.friend_requests
  for insert to authenticated
  with check ((select auth.uid()) = sender_id);

drop policy if exists friend_requests_update on public.friend_requests;
create policy friend_requests_update on public.friend_requests
  for update to authenticated
  using ((select auth.uid()) = receiver_id)
  with check ((select auth.uid()) = receiver_id);

-- friendships: visible to both members; inserts by a member (accept flow).
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships
  for select to authenticated
  using ((select auth.uid()) = user_id_1 or (select auth.uid()) = user_id_2);

drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships
  for insert to authenticated
  with check ((select auth.uid()) = user_id_1 or (select auth.uid()) = user_id_2);

-- messages: only the two participants read/write.
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check ((select auth.uid()) = sender_id);

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update to authenticated
  using ((select auth.uid()) = sender_id)
  with check ((select auth.uid()) = sender_id);

-- ===========================================================================
-- 7. Grants
-- ===========================================================================

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update on public.friend_requests to authenticated;
grant select, insert on public.friendships to authenticated;
grant select, insert, update on public.messages to authenticated;
grant all on public.profiles, public.friend_requests, public.friendships, public.messages to service_role;

-- ===========================================================================
-- 8. handle_new_user — defensive rewrite
--
-- Signs up MUST NEVER fail because an optional table is missing. Every block
-- is guarded and failure-tolerant; friend codes are assigned with retries.
-- ===========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if to_regclass('public.profiles') is not null then
    begin
      insert into public.profiles (id, display_name)
      values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
      )
      on conflict (id) do nothing;

      -- Assign a friend code only when the column exists and the row lacks one.
      if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name = 'profiles'
          and column_name = 'friend_code'
      ) and exists (
        select 1 from public.profiles where id = new.id and friend_code is null
      ) then
        for i in 1..20 loop
          begin
            update public.profiles
            set friend_code = 'AETH-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 4))
            where id = new.id and friend_code is null;
            exit;
          exception when unique_violation then
            null; -- rare code collision; regenerate
          end;
        end loop;
      end if;
    exception when others then
      -- A profile problem must never block sign-up; friend_code assignment
      -- can be repaired later by re-running the backfill block above.
      null;
    end;
  end if;

  if to_regclass('public.character_stats') is not null then
    insert into public.character_stats (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  if to_regclass('public.game_states') is not null then
    insert into public.game_states (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ===========================================================================
-- 9. Realtime for messages (idempotent — no error if already added)
-- ===========================================================================

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
