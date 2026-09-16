/**
 * Economy HUD — the coins/gems wallet, the daily reward and the way into the shop.
 *
 * Every number shown here comes from the server: the local GameState wallet is a
 * display cache that `pullEconomy()` fills, and claiming goes through the
 * `claim_daily_reward()` RPC (lib/economy.ts), which enforces the 24h cooldown
 * against the database clock. Nothing on this screen can mint coins.
 *
 * The wallet is server-owned, so the economy needs an account. When signed out
 * the balances render as "—" and both actions route to /auth.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, Coins, Gem, Lock, Store } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  DAILY_REWARD_COINS,
  claimDailyReward,
  dailyClaimRemainingMs,
  pullEconomy,
} from "@/lib/economy";
import { useGame } from "@/lib/game-store";
import { cn } from "@/lib/utils";

/** Compact h/m/s label for the daily cooldown. */
function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}`;
  return `${s}s`;
}

export function EconomyBar() {
  const { t } = useTranslation();
  const game = useGame();
  const { user } = useAuth();
  const [claiming, setClaiming] = useState(false);
  // Only used to re-render the countdown once per second.
  const [, setTick] = useState(() => Date.now());

  // Refresh the authoritative wallet when a session appears.
  useEffect(() => {
    if (!user) return;
    void pullEconomy();
  }, [user]);

  const remaining = dailyClaimRemainingMs(game.dailyReadyAt);
  const cooling = remaining > 0;

  useEffect(() => {
    if (!cooling) return;
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [cooling]);

  const claim = useCallback(async () => {
    if (!user || claiming) return;
    setClaiming(true);
    try {
      const result = await claimDailyReward();
      if (!result) {
        toast.error(t("economy.claimFailed", "The treasury is sealed — try again shortly."));
        return;
      }
      if (result.claimed) {
        toast.success(t("economy.claimed", "Daily tribute claimed"), {
          description: t("economy.claimedDetail", "+{{amount}} coins", {
            amount: result.amount ?? DAILY_REWARD_COINS,
          }),
        });
      } else {
        toast(t("economy.alreadyClaimed", "You have already claimed today's tribute."));
      }
    } finally {
      setClaiming(false);
    }
  }, [user, claiming, t]);

  const chip = "rune-chip transition-colors duration-200";

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-5">
      <span className={cn(chip, "cursor-default")}>
        <Coins className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span className="font-display tabular-nums" aria-label={t("economy.coins", "Coins")}>
          {user ? game.coins.toLocaleString() : "—"}
        </span>
      </span>

      <span className={cn(chip, "cursor-default")}>
        <Gem className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
        <span className="font-display tabular-nums" aria-label={t("economy.gems", "Gems")}>
          {user ? game.gems.toLocaleString() : "—"}
        </span>
      </span>

      {user ? (
        <button
          type="button"
          onClick={() => void claim()}
          disabled={cooling || claiming}
          className={cn(
            chip,
            cooling || claiming
              ? "cursor-default text-muted-foreground"
              : "hover:border-primary/70 hover:bg-primary/25 active:scale-95",
          )}
          aria-label={t("economy.daily", "Daily reward")}
        >
          <CalendarCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span className="font-display uppercase tracking-[0.12em]">
            {claiming
              ? t("economy.claiming", "…")
              : cooling
                ? formatCountdown(remaining)
                : t("economy.daily", "Daily")}
          </span>
        </button>
      ) : (
        <Link
          to="/auth"
          className={cn(chip, "hover:border-primary/70 hover:bg-primary/25")}
          aria-label={t("economy.daily", "Daily reward")}
        >
          <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="font-display uppercase tracking-[0.12em]">
            {t("economy.daily", "Daily")}
          </span>
        </Link>
      )}

      <Link
        to="/shop"
        className={cn(chip, "hover:border-primary/70 hover:bg-primary/25 active:scale-95")}
      >
        <Store className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span className="font-display uppercase tracking-[0.12em]">
          {t("economy.shop", "Shop")}
        </span>
      </Link>
    </div>
  );
}
