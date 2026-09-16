-- AETHORA — one-time welcome gift (25 coins), claimed from the Mail panel.
--
-- Same security model as the economy migration: the browser has no write
-- grants on game_states, so the gift is minted by this SECURITY DEFINER
-- function only. The "once forever" guard is the (user_id, source_type,
-- source_id) row in reward_history, checked inside the same locked
-- transaction as the credit — replaying the RPC can never pay twice.
--
-- Idempotent: safe to re-apply.

create or replace function public.claim_welcome_gift()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  wallet public.game_states%rowtype;
  gift_coins constant integer := 25;
begin
  if actor is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  insert into public.game_states (user_id) values (actor)
  on conflict (user_id) do nothing;

  -- Row lock: two concurrent taps cannot both pass the already-claimed check.
  select * into wallet from public.game_states where user_id = actor for update;

  -- The one-forever guard: the gift is the single 'gift'/'welcome' ledger row.
  if exists (
    select 1 from public.reward_history
    where user_id = actor and source_type = 'gift' and source_id = 'welcome'
  ) then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'already',
      'coins', wallet.coins,
      'gems', wallet.gems
    );
  end if;

  update public.game_states
     set coins = wallet.coins + gift_coins,
         updated_at = now()
   where user_id = actor;

  insert into public.reward_history (user_id, source_type, source_id, reward_type, amount)
  values (actor, 'gift', 'welcome', 'coins', gift_coins);

  return jsonb_build_object(
    'claimed', true,
    'amount', gift_coins,
    'coins', wallet.coins + gift_coins,
    'gems', wallet.gems
  );
end;
$$;

revoke all on function public.claim_welcome_gift() from public, anon;
grant execute on function public.claim_welcome_gift() to authenticated;
