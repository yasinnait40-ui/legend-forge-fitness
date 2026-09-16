/**
 * The always-on Home HUD: avatar + name + level/XP, the wallet chips with
 * "+" shortcuts, and the settings button — mirroring the mockup's top bar.
 *
 * The wallet numbers are the server mirror (lib/economy.ts). "+" on coins
 * opens the Daily sheet (the earn surface); "+" on gems routes to the shop
 * surface; the gear opens /settings.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { Coins, Gem, Plus, Settings, UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RailPanel } from "@/components/EconomyPanels";
import { useAuth } from "@/hooks/use-auth";
import { levelProgress } from "@/lib/game-data";
import { useGame } from "@/lib/game-store";
import { cn } from "@/lib/utils";

export function TopHud({ onPanel }: { onPanel: (p: RailPanel) => void }) {
  const { t } = useTranslation();
  const game = useGame();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { level, intoLevel, needed, ratio } = levelProgress(game.xp);

  const displayName = user?.email?.split("@")[0]?.slice(0, 14) || t("home.heroName", "Aethorion");

  return (
    <div className="relative z-30 flex items-center justify-between gap-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
      {/* Avatar + name + XP bar — routes signed-out users to the Oath Stone */}
      <button
        type="button"
        onClick={() => void navigate({ to: user ? "/character" : "/auth" })}
        className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-primary/25 bg-card/70 p-1.5 pr-3 text-left backdrop-blur-md transition-colors hover:border-primary/50"
        aria-label={t("home.level", "Level") + " " + level}
      >
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-primary/60 bg-primary/15 shadow-[0_0_18px_-4px_color-mix(in_oklab,var(--primary)_70%,transparent)]">
          <UserRound className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="absolute -bottom-1 rounded-full border border-primary/60 bg-background px-1.5 py-px font-display text-[0.55rem] font-black text-primary">
            {t("home.level", "Lv.")} {level}
          </span>
        </span>
        <span className="min-w-0">
          <span className="font-display block truncate text-sm font-bold text-foreground">
            {displayName}
          </span>
          <span className="mt-1 block h-1.5 w-28 overflow-hidden rounded-full bg-background/80">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-primary/70 to-primary shadow-[0_0_10px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
              style={{ width: `${Math.max(3, ratio * 100)}%` }}
            />
          </span>
          <span className="mt-0.5 block text-[0.6rem] tabular-nums text-muted-foreground">
            {intoLevel} / {needed} XP
          </span>
        </span>
      </button>

      {/* Wallet + settings */}
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="flex items-center gap-1 rounded-full border border-primary/30 bg-card/70 py-1.5 pl-2.5 pr-1 backdrop-blur-md">
          <Coins className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="font-display text-xs font-bold tabular-nums text-foreground">
            {user ? game.coins.toLocaleString() : "—"}
          </span>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                void navigate({ to: "/auth" });
                return;
              }
              onPanel("daily");
            }}
            disabled={!user}
            className={cn(
              "ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary transition-transform hover:bg-primary/35 active:scale-90",
              !user && "opacity-50",
            )}
            aria-label={t("economy.daily", "Daily reward")}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-accent/30 bg-card/70 py-1.5 pl-2.5 pr-1 backdrop-blur-md">
          <Gem className="h-4 w-4 text-accent" aria-hidden="true" />
          <span className="font-display text-xs font-bold tabular-nums text-foreground">
            {user ? game.gems.toLocaleString() : "—"}
          </span>
          <Link
            to="/shop"
            className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent transition-transform hover:bg-accent/35 active:scale-90"
            aria-label={t("economy.shop", "Shop")}
          >
            <Plus className="h-3 w-3" />
          </Link>
        </div>

        <Link
          to="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-card/70 text-primary backdrop-blur-md transition-colors hover:border-primary/60"
          aria-label={t("nav.settings", "Settings")}
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
