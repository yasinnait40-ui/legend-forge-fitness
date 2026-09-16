/**
 * AETHORA — server-authoritative economy (coins, gems, daily reward, shop).
 *
 * The wallet lives in `public.game_states` (`coins`, `gems`, `last_daily_claim_at`)
 * and the browser has NO insert/update/delete grants on it — see
 * `supabase/migrations/20260916000000_aethora_economy.sql`. Every balance change
 * therefore goes through a SECURITY DEFINER RPC:
 *
 *   claim_daily_reward()            → +100 coins, once per rolling 24h (DB clock)
 *   purchase_shop_item(item_id)     → atomic price check, debit, inventory grant
 *
 * The local GameState copy of the wallet is a DISPLAY CACHE of the server value.
 * It is never used to authorise anything: the RPC re-reads the price from
 * `shop_items` and re-reads the balance inside a locked transaction, then returns
 * the authoritative numbers, which we mirror back into the UI.
 */
import { supabase } from "@/integrations/supabase/client";
import type { EquipSlot } from "@/lib/game-data";
import { getGameState, replaceGameState } from "@/lib/game-store";

/** Coin reward granted by one daily claim. Mirrored by the DB function. */
export const DAILY_REWARD_COINS = 100;

/**
 * Cooldown length, used ONLY to render the countdown. The authoritative rule is
 * `interval '24 hours'` inside `claim_daily_reward()`, which compares against the
 * database clock — so a device with a moved clock cannot claim early.
 */
export const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface ShopItem {
  itemId: string;
  slot: EquipSlot;
  name: string;
  priceCoins: number;
  priceGems: number;
}

export interface DailyClaimResult {
  claimed: boolean;
  reason?: "cooldown";
  amount?: number;
  coins: number;
  gems: number;
  /** ISO timestamp of the next claimable moment, as decided by the server. */
  nextClaimAt?: string;
}

export type PurchaseFailure = "unknown_item" | "owned" | "insufficient_funds";

export interface PurchaseResult {
  ok: boolean;
  reason?: PurchaseFailure;
  itemId?: string;
  coins?: number;
  gems?: number;
}

/* -------------------------------------------------------------------------- */
/*  Local mirror (display cache only)                                          */
/* -------------------------------------------------------------------------- */

function mirrorWallet(coins: number, gems: number, dailyReadyAt?: number): void {
  const s = getGameState();
  replaceGameState({
    ...s,
    coins,
    gems,
    dailyReadyAt: dailyReadyAt === undefined ? s.dailyReadyAt : dailyReadyAt,
  });
}

/** Union a server-owned item list into the local inventory mirror. */
function mirrorOwnedItems(itemIds: string[]): void {
  const s = getGameState();
  const merged = Array.from(new Set([...s.inventory, ...itemIds]));
  if (merged.length === s.inventory.length) return;
  replaceGameState({ ...s, inventory: merged });
}

function nextReadyAtFrom(lastClaimAt: string | null): number {
  if (!lastClaimAt) return 0;
  const claimed = Date.parse(lastClaimAt);
  if (!Number.isFinite(claimed)) return 0;
  return claimed + DAILY_COOLDOWN_MS;
}

/* -------------------------------------------------------------------------- */
/*  Reads (allowed by RLS: the client may SELECT its own rows)                 */
/* -------------------------------------------------------------------------- */

/**
 * Pull the authoritative wallet + owned items into the local mirror.
 * No-op when signed out (the economy requires an account — it is server-owned).
 */
export async function pullEconomy(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return;

  const [walletResult, inventoryResult] = await Promise.all([
    supabase
      .from("game_states")
      .select("coins, gems, last_daily_claim_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("inventory").select("item_id").eq("user_id", userId),
  ]);

  if (walletResult.error) {
    console.error("[economy] wallet pull failed", walletResult.error.message);
  } else if (walletResult.data) {
    const { coins, gems, last_daily_claim_at } = walletResult.data;
    mirrorWallet(coins, gems, nextReadyAtFrom(last_daily_claim_at));
  }

  if (inventoryResult.error) {
    console.error("[economy] inventory pull failed", inventoryResult.error.message);
  } else if (Array.isArray(inventoryResult.data)) {
    mirrorOwnedItems(inventoryResult.data.map((row) => row.item_id));
  }
}

/** The server-side shop catalog. Prices shown here are the prices charged. */
export async function fetchShopCatalog(): Promise<ShopItem[]> {
  const { data, error } = await supabase
    .from("shop_items")
    .select("item_id, slot, name, price_coins, price_gems")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[economy] shop catalog fetch failed", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    itemId: row.item_id,
    slot: row.slot as EquipSlot,
    name: row.name,
    priceCoins: row.price_coins,
    priceGems: row.price_gems,
  }));
}

/* -------------------------------------------------------------------------- */
/*  Writes — RPCs only                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Claim the daily reward. The 24h guard, the amount and the balance are all
 * decided server-side; a `claimed: false` answer means the cooldown is still
 * running and carries the next claimable timestamp.
 */
export async function claimDailyReward(): Promise<DailyClaimResult | null> {
  const { data, error } = await supabase.rpc("claim_daily_reward", {});
  if (error) {
    console.error("[economy] daily claim failed", error.message);
    return null;
  }

  const result = data as unknown as DailyClaimResult | null;
  if (!result || typeof result.coins !== "number") return null;

  const readyAt = result.nextClaimAt ? Date.parse(result.nextClaimAt) : undefined;
  mirrorWallet(result.coins, result.gems, readyAt);
  return { ...result, gems: result.gems ?? 0 };
}

/**
 * Buy a catalog item. Only the item id is sent — the server looks up the price,
 * debits the locked wallet and grants the inventory row in one transaction.
 */
export async function purchaseShopItem(itemId: string): Promise<PurchaseResult> {
  const { data, error } = await supabase.rpc("purchase_shop_item", { p_item_id: itemId });
  if (error) {
    console.error("[economy] purchase failed", error.message);
    return { ok: false };
  }

  const result = data as unknown as PurchaseResult | null;
  if (!result) return { ok: false };

  // The server always returns the post-transaction balance; adopt it either way.
  if (typeof result.coins === "number") {
    mirrorWallet(result.coins, result.gems ?? 0);
  }
  if (result.ok) {
    mirrorOwnedItems([result.itemId ?? itemId]);
  }
  return { ...result, gems: result.gems ?? 0 };
}

/** Milliseconds until the next daily claim (0 = claimable now). */
export function dailyClaimRemainingMs(dailyReadyAt: number): number {
  const remaining = dailyReadyAt - Date.now();
  return remaining > 0 ? remaining : 0;
}
