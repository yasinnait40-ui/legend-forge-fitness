-- AETHORA — repair the two progression write paths broken by the RLS hardening.
--
-- 20260904000000_aethora_rls_hardening.sql correctly revoked INSERT/UPDATE/
-- DELETE on the progression tables from `authenticated`, but two write paths
-- were still executing with the CALLER's privileges, so both failed with
-- `permission denied for table ...`. The client swallows that error, falls back
-- to optimistic local state and queues the work, which is why it looked fine in
-- the UI while nothing reached the server:
--
--   1. public.complete_activity() was SECURITY INVOKER. Every statement in it
--      needs a revoked privilege:
--        * `insert into public.game_states`            -> INSERT revoked
--        * `select ... from public.game_states for update` -> requires UPDATE
--        * `insert into public.trial_completions`      -> INSERT revoked
--        * `update public.game_states`                 -> UPDATE revoked
--        * `insert into public.reward_history`         -> INSERT revoked
--      Result: signed-in XP/streak/level never persisted, the offline queue
--      replayed forever without draining, and trial completions were never
--      recorded (so the daily duplicate guard never engaged).
--
--   2. src/lib/cloud-sync.ts upserted public.game_states directly from the
--      browser (the XP/streak mirror plus discovered regions). Denied for
--      exactly the same reason, so region discovery was silently lost too.
--
-- Fix: move both writes into SECURITY DEFINER functions that derive identity
-- exclusively from auth.uid() and only ever touch the caller's OWN row.
--
-- What is deliberately NOT done here: re-granting UPDATE on public.game_states
-- to `authenticated`. That would also reopen the pre-hardening hole where a
-- tampered client writes `coins`/`gems` directly and mints its own wallet,
-- silently defeating the economy RPCs added in
-- 20260916000000_aethora_economy.sql. The functions in this file are the only
-- write path, and neither of them can touch the wallet columns.
--
-- Idempotent: safe to re-apply.

-- ===========================================================================
-- 1. complete_activity — run as the definer so the transaction can write
-- ===========================================================================
-- The body is the original transaction byte for byte; only the security context
-- changes (invoker -> definer). Identity is still auth.uid() only, and
-- `set search_path = ''` keeps the empty-search-path hardening.

create or replace function public.complete_activity(p_kind text, p_activity_id text)
returns jsonb
language plpgsql
security definer
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

-- ===========================================================================
-- 2. sync_progress — the client's progression mirror, replacing its upserts
-- ===========================================================================
-- Every argument is optional and null means "leave this column alone", so the
-- same function serves the debounced stat push and the region-discovery push.
--
-- Guarantees:
--   * Identity comes from auth.uid() only; there is no target-user parameter,
--     so a caller can never address another player's row.
--   * `coins`, `gems` and `last_daily_claim_at` are NOT writable here — they
--     belong exclusively to claim_daily_reward()/purchase_shop_item().
--   * `total_quests` / `total_trials` are NOT writable here — only
--     complete_activity() may advance them, from real server-side completions.
--   * Progression only ever moves forward: xp and best_streak take the max, the
--     stats mirror merges per key with greatest(), and region lists are unioned.
--     A stale replay or an offline client with older local state can never
--     downgrade the cloud save. `streak` is the one exception, because a streak
--     must be able to reset to 0.

create or replace function public.sync_progress(
  p_xp integer default null,
  p_streak integer default null,
  p_best_streak integer default null,
  p_last_active_date date default null,
  p_stats jsonb default null,
  p_discovered_regions jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_stats is not null and jsonb_typeof(p_stats) <> 'object' then
    raise exception 'p_stats must be a json object';
  end if;

  insert into public.game_states (user_id) values (actor) on conflict (user_id) do nothing;

  update public.game_states as gs
  set
    xp = greatest(coalesce(p_xp, gs.xp), 0),
    -- Level is derived server-side from the resulting xp, using the same
    -- formula as complete_activity, so the two write paths cannot disagree.
    level = greatest(1, floor(greatest(coalesce(p_xp, gs.xp), 0) / 100.0)::integer + 1),
    streak = greatest(coalesce(p_streak, gs.streak), 0),
    best_streak = greatest(coalesce(p_best_streak, gs.best_streak), gs.best_streak),
    last_active_date = greatest(coalesce(p_last_active_date, gs.last_active_date), gs.last_active_date),
    -- Per-key raise-only merge. Both sides are guarded by a numeric check so a
    -- single malformed legacy value can never turn this whole sync path into a
    -- 500. Keys absent from p_stats are left untouched by the `||`.
    stats = gs.stats || coalesce((
      select jsonb_object_agg(
               e.key,
               greatest(
                 case when gs.stats ->> e.key ~ '^-?[0-9]+$' then (gs.stats ->> e.key)::integer else 0 end,
                 case when e.value ~ '^-?[0-9]+$' then e.value::integer else 0 end
               )
             )
      from jsonb_each_text(coalesce(p_stats, '{}'::jsonb)) as e
    ), '{}'::jsonb),
    discovered_regions = case
      when p_discovered_regions is null or jsonb_typeof(p_discovered_regions) <> 'array'
        then gs.discovered_regions
      else coalesce((
        select jsonb_agg(distinct elem)
        from jsonb_array_elements(gs.discovered_regions || p_discovered_regions) as elem
      ), '[]'::jsonb)
    end,
    updated_at = now()
  where gs.user_id = actor;
end;
$$;

revoke all on function public.sync_progress(integer, integer, integer, date, jsonb, jsonb) from public, anon;
grant execute on function public.sync_progress(integer, integer, integer, date, jsonb, jsonb) to authenticated;

-- ===========================================================================
-- 3. Verification (run manually after applying)
-- ===========================================================================
--   -- both must report prosecdef = true
--   select proname, prosecdef from pg_proc
--    where proname in ('complete_activity', 'sync_progress');
--
--   -- a signed-in browser must still be denied a direct wallet write
--   -- (expected: permission denied)
--   -- update public.game_states set coins = 999999 where user_id = auth.uid();
--
--   -- and this must succeed and return duplicate:false on the first call
--   -- select public.complete_activity('quest', 'manual-verification-<random>');
