-- AETHORA — economy: coins, gems, daily reward and shop.
--
-- Model (consistent with 20260904000000_aethora_rls_hardening.sql):
--   * The client may only SELECT. INSERT/UPDATE/DELETE on the wallet tables is
--     NOT granted to `authenticated`, so a tampered browser cannot mint coins
--     or items, and cannot move its own balance directly.
--   * Every coin change happens inside a SECURITY DEFINER function that
--     derives identity exclusively from auth.uid(), takes a row lock on the
--     caller's wallet, and re-reads prices from public.shop_items.
--   * Timing (the 24h daily cooldown) always uses the database clock (now()),
--     never a timestamp supplied by the client.
--
-- Idempotent: every statement is safe to re-apply.

-- ===========================================================================
-- 1. Wallet: coins + gems on the existing one-row-per-user game_states
-- ===========================================================================

-- `coins` defaults to 250. That is a welcome grant for new rows AND a one-time
-- backfill for every existing row that does not have the column yet. Because
-- the wallet is server-owned, a client cannot grant itself this balance.
alter table public.game_states
  add column if not exists coins integer not null default 250 check (coins >= 0);

alter table public.game_states
  add column if not exists gems integer not null default 0 check (gems >= 0);

-- The real claim guard. Only the functions below ever write it.
alter table public.game_states
  add column if not exists last_daily_claim_at timestamptz;

-- ===========================================================================
-- 2. Shop catalog — prices live here, never in the request
-- ===========================================================================

create table if not exists public.shop_items (
  item_id text primary key,
  slot text not null check (slot in ('weapon', 'armor', 'relic')),
  name text not null,
  price_coins integer not null check (price_coins > 0),
  price_gems integer not null default 0 check (price_gems >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.shop_items enable row level security;

drop policy if exists shop_items_read on public.shop_items;
create policy shop_items_read on public.shop_items
  for select to anon, authenticated
  using (true);

-- Read-only catalog for clients; only service_role (server jobs) may edit it.
revoke insert, update, delete on public.shop_items from anon, authenticated;
grant select on public.shop_items to anon, authenticated;
grant all on public.shop_items to service_role;

-- Item ids MUST match the EQUIPMENT catalog in src/lib/game-data.ts, so a
-- purchased item is immediately visible and equippable on the character screen.
insert into public.shop_items (item_id, slot, name, price_coins, price_gems, sort_order) values
  ('rusty-dagger',        'weapon', 'Rusty Dagger',         120, 0, 10),
  ('leather-vanguard',    'armor',  'Leather Vanguard',     180, 0, 20),
  ('wardens-longsword',   'weapon', 'Warden''s Longsword',  260, 0, 30),
  ('squires-plate',       'armor',  'Squire''s Plate',      340, 0, 40),
  ('emberforged-sword',   'weapon', 'Emberforged Sword',    520, 0, 50),
  ('wardens-chainmail',   'armor',  'Warden''s Chainmail',  680, 0, 60),
  ('stormforged-halberd', 'weapon', 'Stormforged Halberd',  900, 0, 70),
  ('runebound-aegis',     'armor',  'Runebound Aegis',     1200, 0, 80)
on conflict (item_id) do update set
  slot = excluded.slot,
  name = excluded.name,
  price_coins = excluded.price_coins,
  price_gems = excluded.price_gems,
  sort_order = excluded.sort_order;

-- ===========================================================================
-- 3. Daily reward — one claim per rolling 24h, enforced by the DB clock
-- ===========================================================================

create or replace function public.claim_daily_reward()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  wallet public.game_states%rowtype;
  reward_coins constant integer := 100;
  cooldown constant interval := interval '24 hours';
begin
  if actor is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  insert into public.game_states (user_id) values (actor)
  on conflict (user_id) do nothing;

  -- Row lock: two concurrent taps cannot both pass the cooldown check.
  select * into wallet from public.game_states where user_id = actor for update;

  if wallet.last_daily_claim_at is not null
     and now() < wallet.last_daily_claim_at + cooldown then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'cooldown',
      'coins', wallet.coins,
      'gems', wallet.gems,
      'nextClaimAt', wallet.last_daily_claim_at + cooldown
    );
  end if;

  update public.game_states
     set coins = wallet.coins + reward_coins,
         last_daily_claim_at = now(),
         updated_at = now()
   where user_id = actor;

  insert into public.reward_history (user_id, source_type, source_id, reward_type, amount)
  values (actor, 'daily', to_char(now() at time zone 'utc', 'YYYY-MM-DD'), 'coins', reward_coins);

  return jsonb_build_object(
    'claimed', true,
    'amount', reward_coins,
    'coins', wallet.coins + reward_coins,
    'gems', wallet.gems,
    'nextClaimAt', now() + cooldown
  );
end;
$$;

revoke all on function public.claim_daily_reward() from public, anon;
grant execute on function public.claim_daily_reward() to authenticated;

-- ===========================================================================
-- 4. Purchase — atomic debit + inventory grant
-- ===========================================================================

create or replace function public.purchase_shop_item(p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  item public.shop_items%rowtype;
  wallet public.game_states%rowtype;
begin
  if actor is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if p_item_id is null
     or length(btrim(p_item_id)) = 0
     or length(p_item_id) > 120 then
    raise exception 'invalid item';
  end if;

  -- Existence and price come from the server-side catalog ONLY. The client
  -- never sends a price, so it cannot buy a 1200-coin item for 1 coin.
  select * into item from public.shop_items where item_id = p_item_id and active;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'unknown_item');
  end if;

  insert into public.game_states (user_id) values (actor)
  on conflict (user_id) do nothing;

  select * into wallet from public.game_states where user_id = actor for update;

  if exists (select 1 from public.inventory where user_id = actor and item_id = p_item_id) then
    return jsonb_build_object(
      'ok', false, 'reason', 'owned',
      'coins', wallet.coins, 'gems', wallet.gems
    );
  end if;

  if wallet.coins < item.price_coins or wallet.gems < item.price_gems then
    return jsonb_build_object(
      'ok', false, 'reason', 'insufficient_funds',
      'coins', wallet.coins, 'gems', wallet.gems
    );
  end if;

  update public.game_states
     set coins = wallet.coins - item.price_coins,
         gems = wallet.gems - item.price_gems,
         updated_at = now()
   where user_id = actor;

  insert into public.inventory (user_id, item_id, quantity)
  values (actor, item.item_id, 1)
  on conflict (user_id, item_id) do update
    set quantity = public.inventory.quantity + 1;

  insert into public.reward_history (user_id, source_type, source_id, reward_type, amount, item_id)
  values (actor, 'shop', item.item_id, 'item', -item.price_coins, item.item_id);

  return jsonb_build_object(
    'ok', true,
    'itemId', item.item_id,
    'coins', wallet.coins - item.price_coins,
    'gems', wallet.gems - item.price_gems
  );
end;
$$;

revoke all on function public.purchase_shop_item(text) from public, anon;
grant execute on function public.purchase_shop_item(text) to authenticated;
