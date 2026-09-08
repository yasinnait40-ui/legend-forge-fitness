import { useCallback, useEffect, useRef, useState } from "react";
import { Gift, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  awardAdChest,
  adRewardCooldownRemaining,
  dailyChestClaimedToday,
  markAdRewardGranted,
  useGame,
  type TreasureReward,
} from "@/lib/game-store";

/*
 * Monetag ad integration.
 *
 * Site code:       27d91babd
 * Banner zone:     a1vqtk2vytm3017u  (multiplex / banner tag)
 * Rewarded zone:   1fya3mwg7wkwjbkc  (Monetag SDK → show_<zone>())
 *
 * The Monetag SDK exposes a global function named `show_<zoneId>` once its
 * script has loaded. Rewarded ads must be shown by CALLING that function —
 * loading the tag alone renders nothing.
 */

const MONETAG_TAG_HOST = "https://inklinkor.com/tag.min.js";
const BANNER_ZONE = "a1vqtk2vytm3017u";
const REWARDED_ZONE = "1fya3mwg7wkwjbkc";

/** Minimum time between rewarded ads, in milliseconds. */
const AD_COOLDOWN_MS = 90_000;

/** The global show function Monetag's SDK installs (typed loosely on purpose). */
type MonetagShowFn = (options?: Record<string, unknown>) => Promise<void>;

function rewardedShowFnName(): string {
  return `show_${REWARDED_ZONE.replace(/[^a-zA-Z0-9_]/g, "")}`;
}

let sdkLoadPromise: Promise<void> | null = null;

/**
 * Load the Monetag SDK exactly once per page load (deduped across route
 * navigations — Monetag treats duplicate tags as a breaking mistake).
 */
function loadMonetagSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${MONETAG_TAG_HOST}"]`,
    );
    const script = existing ?? document.createElement("script");
    script.src = MONETAG_TAG_HOST;
    script.setAttribute("data-zone", REWARDED_ZONE);
    script.setAttribute("data-sdk", rewardedShowFnName());
    script.setAttribute("data-cfasync", "false");
    script.async = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => {
      sdkLoadPromise = null; // allow a retry on the next attempt
      reject(new Error("Monetag SDK failed to load"));
    });
    if (!existing) (document.body || document.documentElement).appendChild(script);
  });
  return sdkLoadPromise;
}

/**
 * Show the rewarded ad and resolve when the user has watched it.
 * Rejects when the SDK is unavailable, the ad fails, or the user skips.
 */
export async function showRewardedAd(): Promise<void> {
  await loadMonetagSdk();
  const fn = (window as unknown as Record<string, unknown>)[
    rewardedShowFnName()
  ] as MonetagShowFn | undefined;
  if (typeof fn !== "function") {
    throw new Error("Rewarded ad unavailable — SDK did not register its show function");
  }
  await fn();
}

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

/**
 * "Watch an ad for a bonus chest" — available after the day's free chest has
 * been claimed (first quest/trial completed). Each completed ad rolls one
 * bonus chest through awardAdChest, unlimited (gated only by the persisted
 * 90-second cooldown) and independent of the once-per-day free chest.
 */
export function MonetagRewardedButton({
  onReward,
}: {
  onReward?: (treasure: TreasureReward | null) => void;
}) {
  const { t } = useTranslation();
  useGame(); // re-render when the daily-chest claim state changes
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const [cooldownLeft, setCooldownLeft] = useState(() =>
    adRewardCooldownRemaining(AD_COOLDOWN_MS),
  );
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Tick the countdown every second while a cooldown is active.
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = setInterval(() => {
      if (!mounted.current) return;
      setCooldownLeft(adRewardCooldownRemaining(AD_COOLDOWN_MS));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownLeft]);

  const dailyClaimed = dailyChestClaimedToday();

  const onClick = useCallback(async () => {
    if (state !== "idle" || adRewardCooldownRemaining(AD_COOLDOWN_MS) > 0) return;
    if (!dailyChestClaimedToday()) return;
    setState("loading");
    try {
      await showRewardedAd();
      markAdRewardGranted();
      const result = awardAdChest();
      if (mounted.current) setCooldownLeft(adRewardCooldownRemaining(AD_COOLDOWN_MS));
      onReward?.(result.treasure);
      if (result.leveledUp) {
        toast.success(
          t("ads.chestLevelUp", "The chest's power surges through you — Level {{level}}!", {
            level: result.newLevel,
          }),
        );
      }
    } catch {
      if (mounted.current) {
        toast.error(t("ads.blessingFailed", "The blessing did not answer. Please try again."));
      }
    } finally {
      if (mounted.current) setState("idle");
    }
  }, [state, t, onReward]);

  const label =
    state === "loading"
      ? t("ads.summoning", "Summoning…")
      : state === "playing"
        ? t("ads.watching", "Watch closely…")
        : dailyClaimed
          ? t("ads.watchChest", "Watch an ad for a bonus chest")
          : t("ads.chestLocked", "Finish a quest or trial to unlock today's bonus chest");

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={state !== "idle" || cooldownLeft > 0 || !dailyClaimed}
      className="rune-button mt-3 inline-flex items-center gap-2 px-4 py-2 text-[0.65rem] uppercase tracking-[0.2em] disabled:opacity-60"
      aria-disabled={state !== "idle" || cooldownLeft > 0 || !dailyClaimed}
    >
      {dailyClaimed ? <Sparkles className="size-3.5" /> : <Gift className="size-3.5" />}
      {cooldownLeft > 0 ? (
        <span className="tabular-nums">
          {t("ads.cooldown", "Restore in {{time}}", { time: formatCountdown(cooldownLeft) })}
        </span>
      ) : (
        label
      )}
    </button>
  );
}

/**
 * Real Monetag banner. The multiplex tag renders its own creative into the
 * page; the placeholder text is removed once the tag is injected so the zone
 * never displays a fake "Advertisement" label over an empty box.
 */
export function MonetagBanner() {
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current) return;
    injected.current = true;
    // Banner zone uses the plain multiplex tag (no data-sdk show function).
    if (document.querySelector(`script[data-zone="${BANNER_ZONE}"]`)) return;
    const s = document.createElement("script");
    s.src = MONETAG_TAG_HOST;
    s.setAttribute("data-zone", BANNER_ZONE);
    s.setAttribute("data-cfasync", "false");
    s.async = true;
    (document.body || document.documentElement).appendChild(s);
  }, []);

  return (
    <div id="monetag-banner" className="monetag-ad-container mt-6 mb-2 min-h-[100px] overflow-hidden" />
  );
}
