/**
 * The Merchant's Hall — the AETHORA shop.
 *
 * The catalog (and every price) is read from the server-side `shop_items` table.
 * Buying sends ONLY the item id to `purchase_shop_item()`, which re-reads the
 * price, checks the locked wallet and grants the inventory row in one
 * transaction. This page can therefore never be tricked into a cheaper trade —
 * the worst a tampered client can do is get `insufficient_funds` back.
 */
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Coins, Gem, Lock, Store } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import guildHall from "@/assets/guild-hall.jpg";
import { RealmScreen } from "@/components/RealmScreen";
import { RuneHeading, RunePanel } from "@/components/RunePanel";
import { useAuth } from "@/hooks/use-auth";
import { fetchShopCatalog, pullEconomy, purchaseShopItem, type ShopItem } from "@/lib/economy";
import { RARITY_COLORS, RARITY_LABELS, SLOT_LABELS, itemById } from "@/lib/game-data";
import { useGame } from "@/lib/game-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "The Merchant's Hall — Armory & Shop | AETHORA" },
      {
        name: "description",
        content:
          "Spend the coins you earn in the realm on weapons and armor for your hero. Every trade is verified by the Aethora treasury.",
      },
      { property: "og:title", content: "The Merchant's Hall — Armory & Shop | AETHORA" },
      {
        property: "og:description",
        content: "Trade coins earned in the realm for weapons and armor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { t } = useTranslation();
  const game = useGame();
  const { user } = useAuth();
  const [items, setItems] = useState<ShopItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchShopCatalog().then((catalog) => {
      if (active) setItems(catalog);
    });
    return () => {
      active = false;
    };
  }, []);

  // Re-read the authoritative wallet whenever a session appears.
  useEffect(() => {
    if (!user) return;
    void pullEconomy();
  }, [user]);

  const buy = useCallback(
    async (item: ShopItem) => {
      if (!user || busy) return;
      setBusy(item.itemId);
      try {
        const result = await purchaseShopItem(item.itemId);
        if (result.ok) {
          toast.success(t("economy.purchased", "{{name}} acquired", { name: item.name }), {
            description: t("economy.purchasedDetail", "-{{price}} coins · added to your armory", {
              price: item.priceCoins,
            }),
          });
          return;
        }
        if (result.reason === "insufficient_funds") {
          toast.error(t("economy.insufficient", "Not enough coins for this trade."));
        } else if (result.reason === "owned") {
          toast.error(t("economy.alreadyOwned", "You already own this item."));
        } else {
          toast.error(t("economy.purchaseFailed", "The merchant could not complete the trade."));
        }
      } finally {
        setBusy(null);
      }
    },
    [user, busy, t],
  );

  const owned = new Set(game.inventory);

  return (
    <RealmScreen
      image={guildHall}
      alt="A torch-lit merchant's hall with banners, crates of wares and a guild steward"
      imagePosition="center 35%"
      veil="strong"
    >
      <header className="pt-14 text-center">
        <RuneHeading>{t("economy.shopKicker", "The Merchant's Hall")}</RuneHeading>
        <h1 className="text-glow-gold font-display mt-3 text-3xl font-black tracking-[0.08em] text-primary">
          {t("economy.shopTitle", "Armory of Aethora")}
        </h1>
        <p className="mt-2 text-xs tracking-wide text-muted-foreground">
          {t(
            "economy.shopSubtitle",
            "Coins earned in the realm, traded for real steel. The treasury verifies every purchase.",
          )}
        </p>
      </header>

      {/* Purse */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="rune-chip cursor-default">
          <Coins className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span className="font-display tabular-nums" aria-label={t("economy.coins", "Coins")}>
            {user ? game.coins.toLocaleString() : "—"}
          </span>
        </span>
        <span className="rune-chip cursor-default">
          <Gem className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
          <span className="font-display tabular-nums" aria-label={t("economy.gems", "Gems")}>
            {user ? game.gems.toLocaleString() : "—"}
          </span>
        </span>
      </div>

      {!user && (
        <RunePanel className="mt-5 flex items-center gap-3">
          <Lock className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
            {t(
              "economy.signInToTrade",
              "Your purse lives in the cloud, traveler. Sign in to earn and spend coins.",
            )}
          </p>
          <Link to="/auth" className="btn-gold !w-auto shrink-0 !px-4 !py-2 text-[0.65rem]">
            {t("auth.signIn", "Sign in")}
          </Link>
        </RunePanel>
      )}

      <div className="rpg-stagger-in mt-5 space-y-4">
        {items === null && (
          <p className="text-center text-xs italic text-muted-foreground">
            {t("economy.loadingStock", "The merchant unpacks the crates…")}
          </p>
        )}

        {items?.length === 0 && (
          <p className="text-center text-xs italic text-muted-foreground">
            {t("economy.emptyStock", "The shelves are bare. Return when the caravan arrives.")}
          </p>
        )}

        {items?.map((item) => {
          const meta = itemById(item.itemId);
          const isOwned = owned.has(item.itemId);
          const affordable = game.coins >= item.priceCoins && game.gems >= item.priceGems;
          const trading = busy === item.itemId;

          return (
            <RunePanel key={item.itemId} className={cn(isOwned && "border-primary/50")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold tracking-[0.05em]">
                    {item.name}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rune-chip !px-2 !py-0.5 text-[0.58rem] uppercase tracking-[0.18em]">
                      {SLOT_LABELS[item.slot]}
                    </span>
                    {meta && (
                      <span
                        className="rune-chip !px-2 !py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.18em]"
                        style={{ color: RARITY_COLORS[meta.rarity] }}
                      >
                        {RARITY_LABELS[meta.rarity]}
                      </span>
                    )}
                  </div>
                  {meta && (
                    <p className="mt-2 text-xs italic leading-relaxed text-muted-foreground">
                      {meta.flavor}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-lg font-black leading-none text-primary tabular-nums">
                    {item.priceCoins.toLocaleString()}
                  </p>
                  <p className="mt-1 text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {t("economy.coins", "Coins")}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                {isOwned ? (
                  <div className="flex items-center justify-center gap-2 rounded-md border border-primary/45 bg-primary/10 py-2.5">
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="font-display text-[0.7rem] font-bold uppercase tracking-[0.22em] text-primary">
                      {t("economy.owned", "In your armory")}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void buy(item)}
                    disabled={!user || trading}
                    aria-disabled={!user || trading}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-md border py-2.5 transition",
                      user && affordable
                        ? "border-primary/40 bg-primary/10 hover:bg-primary/20 active:scale-[0.99]"
                        : "border-border/60 bg-background/40 opacity-70",
                    )}
                  >
                    <Store className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="font-display text-[0.7rem] font-bold uppercase tracking-[0.18em] text-primary">
                      {trading ? t("economy.buying", "Trading…") : t("economy.buy", "Buy")}
                    </span>
                  </button>
                )}
              </div>
            </RunePanel>
          );
        })}
      </div>
    </RealmScreen>
  );
}
