-- Non-destructive corrective migration for AETHORA authoritative progression.
-- Safe to apply to an existing project: all objects are created only when missing.

create table if not exists public.game_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  streak integer not null default 0 check (streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  last_active_date date,
  stats jsonb not null default '{}'::jsonb,
  equipment jsonb not null default '{}'::jsonb,
  total_quests integer not null default 0 check (total_quests >= 0),
  total_trials integer not null default 0 check (total_trials >= 0),
  achievements jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.trial_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trial_id text not null,
  trial_name text not null default '',
  completed_at timestamptz not null default now(),
  completed_day date not null default current_date,
  xp_earned integer not null default 0 check (xp_earned >= 0),
  unique (user_id, trial_id, completed_day)
);

create table if not exists public.reward_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  reward_type text not null,
  amount integer,
  item_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  quantity integer not null default 1 check (quantity >= 0),
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table if not exists public.achievement_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index if not exists quest_completions_user_day_idx on public.quest_completions(user_id, quest_date);
create index if not exists trial_completions_user_day_idx on public.trial_completions(user_id, completed_day);
create index if not exists reward_history_user_created_idx on public.reward_history(user_id, created_at desc);

alter table public.game_states enable row level security;
alter table public.trial_completions enable row level security;
alter table public.reward_history enable row level security;
alter table public.inventory enable row level security;
alter table public.achievement_unlocks enable row level security;

drop policy if exists game_states_owner on public.game_states;
create policy game_states_owner on public.game_states for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists trial_completions_owner on public.trial_completions;
create policy trial_completions_owner on public.trial_completions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists reward_history_owner on public.reward_history;
create policy reward_history_owner on public.reward_history for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists inventory_owner on public.inventory;
create policy inventory_owner on public.inventory for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists achievement_unlocks_owner on public.achievement_unlocks;
create policy achievement_unlocks_owner on public.achievement_unlocks for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.game_states, public.trial_completions, public.reward_history, public.inventory, public.achievement_unlocks to authenticated;
grant all on public.game_states, public.trial_completions, public.reward_history, public.inventory, public.achievement_unlocks to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.character_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  insert into public.game_states (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- The application calls this function without a user_id argument. Identity is always auth.uid().
create or replace function public.complete_activity(p_kind text, p_activity_id text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  earned integer;
  state_row public.game_states%rowtype;
  completed boolean := false;
  new_level integer;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_kind not in ('quest', 'trial') or p_activity_id is null or length(trim(p_activity_id)) = 0 or length(p_activity_id) > 120 then
    raise exception 'invalid activity';
  end if;
  earned := case when p_kind = 'quest' then 25 else 50 end;
  insert into public.game_states (user_id) values (actor) on conflict (user_id) do nothing;
  select * into state_row from public.game_states where user_id = actor for update;
  if p_kind = 'quest' then
    insert into public.quest_completions (user_id, quest_id, xp_earned)
    values (actor, p_activity_id, earned)
    on conflict (user_id, quest_id, quest_date) do nothing;
    completed := found;
  else
    insert into public.trial_completions (user_id, trial_id, trial_name, xp_earned)
    values (actor, p_activity_id, p_activity_id, earned)
    on conflict (user_id, trial_id, completed_day) do nothing;
    completed := found;
  end if;
  if not completed then return jsonb_build_object('duplicate', true); end if;
  new_level := greatest(1, floor((state_row.xp + earned) / 100.0)::integer + 1);
  update public.game_states
  set xp = state_row.xp + earned, level = new_level,
      total_quests = state_row.total_quests + case when p_kind = 'quest' then 1 else 0 end,
      total_trials = state_row.total_trials + case when p_kind = 'trial' then 1 else 0 end,
      updated_at = now()
  where user_id = actor;
  insert into public.reward_history(user_id, source_type, source_id, reward_type, amount)
  values (actor, p_kind, p_activity_id, 'xp', earned);
  return jsonb_build_object('duplicate', false, 'xpGained', earned, 'xp', state_row.xp + earned, 'level', new_level, 'streak', state_row.streak, 'bestStreak', state_row.best_streak, 'rewardItem', null);
end;
$$;
revoke all on function public.complete_activity(text, text) from public, anon;
grant execute on function public.complete_activity(text, text) to authenticated;
