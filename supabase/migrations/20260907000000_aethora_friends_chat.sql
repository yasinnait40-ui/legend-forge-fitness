-- AETHORA P2.0 — Friends & Chat
-- Adds friend_code to profiles, friend_requests, friendships, and messages tables.
-- Idempotent: safe to re-apply.

-- 1. Add friend_code to profiles
alter table public.profiles
  add column if not exists friend_code text unique;

-- Backfill existing users with friend codes
update public.profiles
set friend_code = 'AETH-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 4))
where friend_code is null;

-- Make friend_code not null after backfill
alter table public.profiles
  alter column friend_code set not null;

-- Unique index for fast code lookups
create unique index if not exists profiles_friend_code_idx on public.profiles(friend_code);

-- 2. Friend requests table
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

-- 3. Friendships table (bidirectional)
create table if not exists public.friendships (
  user_id_1 uuid not null references auth.users(id) on delete cascade,
  user_id_2 uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id_1, user_id_2),
  check (user_id_1 < user_id_2)
);

create index if not exists friendships_user1_idx on public.friendships(user_id_1);
create index if not exists friendships_user2_idx on public.friendships(user_id_2);

-- 4. Messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (length(content) > 0 and length(content) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages(sender_id, recipient_id, created_at desc);
create index if not exists messages_recipient_idx on public.messages(recipient_id, created_at desc);

-- 5. Enable RLS on all new tables
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.messages enable row level security;

-- 6. RLS policies for friend_requests
-- Users can see requests they sent or received
drop policy if exists friend_requests_select on public.friend_requests;
create policy friend_requests_select on public.friend_requests
  for select to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = receiver_id);

-- Users can insert requests where they are the sender
drop policy if exists friend_requests_insert on public.friend_requests;
create policy friend_requests_insert on public.friend_requests
  for insert to authenticated
  with check ((select auth.uid()) = sender_id);

-- Users can update requests where they are the receiver (accept/decline)
drop policy if exists friend_requests_update on public.friend_requests;
create policy friend_requests_update on public.friend_requests
  for update to authenticated
  using ((select auth.uid()) = receiver_id)
  with check ((select auth.uid()) = receiver_id);

-- 7. RLS policies for friendships
-- Users can see friendships they are part of
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships
  for select to authenticated
  using ((select auth.uid()) = user_id_1 or (select auth.uid()) = user_id_2);

-- Server-side inserts via RPC only (or the friendship creator)
drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships
  for insert to authenticated
  with check ((select auth.uid()) = user_id_1 or (select auth.uid()) = user_id_2);

-- 8. RLS policies for messages
-- Users can see messages they sent or received
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated
  using ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id);

-- Users can insert messages where they are the sender
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check ((select auth.uid()) = sender_id);

-- Users can update only their own messages (for future edit/delete)
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
  for update to authenticated
  using ((select auth.uid()) = sender_id)
  with check ((select auth.uid()) = sender_id);

-- 9. Grant privileges
grant select, insert, update on public.friend_requests to authenticated;
grant select, insert on public.friendships to authenticated;
grant select, insert, update on public.messages to authenticated;
grant all on public.friend_requests, public.friendships, public.messages to service_role;

-- 10. Update handle_new_user to generate friend_code on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, friend_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'AETH-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 4))
  )
  on conflict (id) do update
    set friend_code = coalesce(public.profiles.friend_code, 'AETH-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 4)));
  insert into public.character_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  insert into public.game_states (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- 11. Enable realtime for messages
alter publication supabase_realtime add table public.messages;
