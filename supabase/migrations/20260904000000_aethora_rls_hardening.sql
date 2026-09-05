-- AETHORA P0.3 — security & RLS hardening.
-- Applies cleanly to an existing project: every statement is idempotent.
--
-- Model: the browser may SELECT its own rows. ALL progression writes (XP,
-- level, streak, completions, reward history) happen inside the
-- complete_activity() SECURITY INVOKER transaction, which derives identity
-- exclusively from auth.uid(). Direct UPDATE/INSERT/DELETE grants on the
-- progression tables are removed so a tampered client cannot mint XP,
-- overwrite streaks, or rewrite its history.

-- ===========================================================================
-- 1. Lock down function privileges
-- ===========================================================================

-- The new-user trigger fires on auth.users; only the table owner needs it.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- The progression transaction is the ONLY write path for progression data.
revoke all on function public.complete_activity(text, text) from public, anon;
grant execute on function public.complete_activity(text, text) to authenticated;

-- ===========================================================================
-- 2. Withdraw direct table-write privileges from authenticated clients
-- ===========================================================================
-- SELECT remains granted (the client reads its own rows through RLS).
-- service_role keeps full access (server-side jobs).

revoke insert, update, delete on public.game_states, public.trial_completions,
  public.reward_history, public.inventory, public.achievement_unlocks
from authenticated;

-- ===========================================================================
-- 3. Owner-only RLS policies (defense in depth behind the grants)
-- ===========================================================================

drop policy if exists game_states_owner on public.game_states;
create policy game_states_owner on public.game_states
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists game_states_write on public.game_states;
create policy game_states_write on public.game_states
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists trial_completions_owner on public.trial_completions;
create policy trial_completions_owner on public.trial_completions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists reward_history_owner on public.reward_history;
create policy reward_history_owner on public.reward_history
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists inventory_owner on public.inventory;
create policy inventory_owner on public.inventory
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists achievement_unlocks_owner on public.achievement_unlocks;
create policy achievement_unlocks_owner on public.achievement_unlocks
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ===========================================================================
-- 4. Guard against accidental public exposure
-- ===========================================================================

-- RLS must remain enabled; the complete_activity RPC runs as the caller, so it
-- would be blocked too if these were disabled — which is the desired failure
-- mode over silent cross-user leakage.
do $$
declare
  t text;
begin
  foreach t in array array['game_states', 'trial_completions', 'reward_history',
                           'inventory', 'achievement_unlocks']
  loop
    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t and c.relrowsecurity
    ) then
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end
$$;
