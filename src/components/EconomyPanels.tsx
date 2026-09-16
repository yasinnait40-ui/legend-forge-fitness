/**
 * The side-rail panels — Rewards, Mail and Daily — as bottom sheets.
 *
 * REWARDS opens the Merchant's Hall (the real spendable-reward surface).
 * MAIL    lists the server-side reward ledger (`reward_history`) and hosts the
 *         one-time welcome gift (+25 coins), whose once-forever guard lives
 *         entirely inside the `claim_welcome_gift()` RPC.
 * DAILY   claims the daily tribute (24h cooldown on the database clock).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, Coins, Gem, Gift, Sword, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  DAILY_REWARD_COINS,
  claimDailyReward,
  claimWelcomeGift,
  dailyClaimRemainingMs,
  fetchRewardHistory,
  pullEconomy,
  type RewardLedgerEntry,
} from "@/lib/economy";
import { useGame } from "@/lib/game-store";
import { cn } from "@/lib/utils";

export type RailPanel = "mail" | "daily" | null;

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}`;
  return `${s}s`;
}

/** Shared dark panel with the gold frame, mirroring the mockup's drawer style. */
function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label={title}
        onClick={onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg rounded-t-2xl border-t border-primary/40 bg-card/95 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-4 shadow-[0_-18px_60px_-20px_rgb(0_0_0/0.8)] backdrop-blur-xl">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-primary/30" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-glow-gold font-display text-sm font-black uppercase tracking-[0.24em] text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border/60 p-1.5 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60dvh] overflow-y-auto pr-0.5">{children}</div>
      </div>
    </div>
  );
}

/** Date/label for one ledger row, resolved without leaking internal ids. */
function ledgerLabel(entry: RewardLedgerEntry): string {
  switch (entry.sourceType) {
    case "gift":
      return "mail.label.gift";
    case "daily":
      return "mail.label.daily";
    case "shop":
      return "mail.label.shop";
    case "quest":
      return "mail.label.quest";
    case "trial":
      return "mail.label.trial";
    default:
      return "mail.label.misc";
  }
}

function MailPanel({ signedIn }: { signedIn: boolean }) {
  const { t } = useTranslation();
  const game = useGame();
  const [history, setHistory] = useState<RewardLedgerEntry[] | null>(null);
  const [claiming, setClaiming] = useState(false);

  const giftClaimed = useMemo(
    () => Boolean(history?.some((e) => e.sourceType === "gift" && e.sourceId === "welcome")),
    [history],
  );

  const load = useCallback(async () => {
    if (!signedIn) return;
    const rows = await fetchRewardHistory(30);
    setHistory(rows);
  }, [signedIn]);

  useEffect(() => {
    void load();
  }, [load]);

  const claimGift = useCallback(async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const result = await claimWelcomeGift();
      if (!result) {
        toast.error(t("mail.giftFailed", "The gift seal would not break — try again."));
        return;
      }
      if (result.claimed) {
        toast.success(t("mail.giftClaimed", "Welcome gift claimed"), {
          description: `+${result.amount} ${t("economy.coins", "coins")}`,
        });
      } else {
        toast(t("mail.giftAlready", "The welcome gift was already unsealed."));
      }
      void load();
    } finally {
      setClaiming(false);
    }
  }, [claiming, t, load]);

  if (!signedIn) {
    return (
      <p className="pb-2 text-sm text-muted-foreground">
        {t("mail.signIn", "Swear your oath at the Oath Stone to open your raven post.")}
      </p>
    );
  }

  const giftAvailable = !giftClaimed;

  return (
    <div className="space-y-3 pb-2">
      {giftAvailable && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 p-3">
          <Gift className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-primary">
              {t("mail.giftTitle", "Welcome gift")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("mail.giftBody", "+25 coins, sealed for you alone. One time only.")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void claimGift()}
            disabled={claiming}
            className="btn-gold !px-3 !py-1.5 text-[0.6rem] disabled:opacity-60"
          >
            {claiming ? t("economy.claiming", "…") : t("mail.giftClaim", "Claim")}
          </button>
        </div>
      )}

      {history === null ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          {t("mail.loading", "Unsealing the scrolls…")}
        </p>
      ) : history.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          {t("mail.empty", "No ravens yet — complete a quest and the ledger will speak.")}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {history.map((entry) => {
            const isItem = entry.rewardType === "item";
            const negative = (entry.amount ?? 0) < 0;
            return (
              <li
                key={entry.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2"
              >
                {isItem ? (
                  <Sword className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                ) : (
                  <Coins className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {t(ledgerLabel(entry), entry.sourceId)}
                  </p>
                  <p className="text-[0.62rem] text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-display text-xs font-bold tabular-nums",
                    negative ? "text-accent" : "text-primary",
                  )}
                >
                  {isItem ? t("mail.item", "item") : `${negative ? "" : "+"}${entry.amount}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="pt-1 text-center text-[0.62rem] text-muted-foreground">
        {t("mail.balance", "Treasury")}: {game.coins.toLocaleString()}{" "}
        <Coins className="inline h-3 w-3 text-primary" /> · {game.gems.toLocaleString()}{" "}
        <Gem className="inline h-3 w-3 text-accent" />
      </p>
    </div>
  );
}

function DailyPanel({ signedIn }: { signedIn: boolean }) {
  const { t } = useTranslation();
  const game = useGame();
  const [claiming, setClaiming] = useState(false);
  const [, setTick] = useState(() => Date.now());

  const remaining = dailyClaimRemainingMs(game.dailyReadyAt);
  const cooling = remaining > 0;

  useEffect(() => {
    if (!cooling) return;
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [cooling]);

  const claim = useCallback(async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const result = await claimDailyReward();
      if (!result) {
        toast.error(t("economy.claimFailed", "The treasury is sealed — try again shortly."));
        return;
      }
      if (result.claimed) {
        toast.success(t("economy.claimed", "Daily tribute claimed"), {
          description: `+${result.amount ?? DAILY_REWARD_COINS} ${t("economy.coins", "coins")}`,
        });
        void pullEconomy();
      } else {
        toast(t("economy.alreadyClaimed", "You have already claimed today's tribute."));
      }
    } finally {
      setClaiming(false);
    }
  }, [claiming, t]);

  return (
    <div className="space-y-4 pb-2 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/50 bg-primary/10 shadow-[0_0_30px_-6px_color-mix(in_oklab,var(--primary)_60%,transparent)]">
        <CalendarCheck className="h-10 w-10 text-primary" aria-hidden="true" />
      </div>
      <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-foreground">
        {t("daily.title", "Daily tribute")}
      </p>
      <p className="mx-auto max-w-xs text-xs text-muted-foreground">
        {t("daily.body", "+{{amount}} coins every day, sealed by the realm's clock — not yours.", {
          amount: DAILY_REWARD_COINS,
        })}
      </p>
      {signedIn ? (
        <button
          type="button"
          onClick={() => void claim()}
          disabled={cooling || claiming}
          className={cn("btn-gold mx-auto", (cooling || claiming) && "disabled:opacity-60")}
        >
          {claiming
            ? t("economy.claiming", "…")
            : cooling
              ? t("daily.readyIn", "Ready in {{time}}", { time: formatCountdown(remaining) })
              : t("daily.claim", "Claim +{{amount}}", { amount: DAILY_REWARD_COINS })}
        </button>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("mail.signIn", "Swear your oath at the Oath Stone to open your raven post.")}
        </p>
      )}
    </div>
  );
}

export function EconomyPanels({
  panel,
  onClose,
  signedIn,
}: {
  panel: RailPanel;
  onClose: () => void;
  signedIn: boolean;
}) {
  const { t } = useTranslation();

  if (!panel) return null;

  return (
    <Sheet
      title={panel === "mail" ? t("mail.title", "Raven Post") : t("daily.title", "Daily tribute")}
      onClose={onClose}
    >
      {panel === "mail" ? <MailPanel signedIn={signedIn} /> : <DailyPanel signedIn={signedIn} />}
    </Sheet>
  );
}

/** Red-dot state for the rail: gift unclaimed or daily ready. */
export function useRailBadges(signedIn: boolean): { mail: boolean; daily: boolean } {
  const game = useGame();
  const [giftSeen, setGiftSeen] = useState<boolean>(() => {
    try {
      return localStorage.getItem("aethora.mail.seen") === "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!signedIn) return;
    // A cheap probe: if the welcome-gift ledger row exists, mark seen.
    let cancelled = false;
    void (async () => {
      const rows = await fetchRewardHistory(50);
      if (cancelled) return;
      if (rows.some((e) => e.sourceType === "gift" && e.sourceId === "welcome")) {
        try {
          localStorage.setItem("aethora.mail.seen", "1");
        } catch {
          /* private mode — badges just stay visible */
        }
        setGiftSeen(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  return {
    mail: signedIn && !giftSeen,
    daily: signedIn && dailyClaimRemainingMs(game.dailyReadyAt) === 0,
  };
}
