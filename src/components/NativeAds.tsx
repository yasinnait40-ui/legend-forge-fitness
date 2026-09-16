/**
 * Ads for AETHORA — Unity LevelPlay on native, Monetag on web.
 *
 * Exactly two formats are used:
 * - FreeBoostButton: rewarded ad → the premium "Free Boost" perk (a bonus
 *   treasure chest). The reward is granted ONLY when the ad reports
 *   `completed`, so skipping or closing early yields nothing.
 * - showInterstitialAd: interstitial shown at natural transitions only (trial
 *   or boss victory) and rate-limited, so it never becomes a fixture of the UI.
 *
 * On Android (Capacitor): the native Unity LevelPlay plugin.
 * On web: the Monetag rewarded SDK.
 * Banners are unsupported end-to-end — nothing can pin an ad to the interface.
 */
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
import {
  isNativeAds,
  showNativeRewarded,
  showNativeInterstitial,
  waitForNativeAdsInit,
  getNativeAdsInitError,
  isNativeAdsInitialized,
} from "@/lib/native-ads";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Minimum time between rewarded ads, in milliseconds. */
const AD_COOLDOWN_MS = 90_000;

/** Minimum time between interstitials — keeps them at real transitions only. */
const INTERSTITIAL_COOLDOWN_MS = 120_000;

/** Quiet window after a rewarded ad, so the two formats never stack up. */
const INTERSTITIAL_AFTER_REWARDED_QUIET_MS = 60_000;

/* ------------------------------------------------------------------ */
/*  Web fallback (Monetag SDK) — only used on non-native platforms     */
/* ------------------------------------------------------------------ */

const MONETAG_TAG_HOST = "https://inklinkor.com/tag.min.js";
const REWARDED_ZONE = "1fya3mwg7wkwjbkc";

type MonetagShowFn = (options?: Record<string, unknown>) => Promise<void>;

function rewardedShowFnName(): string {
  return `show_${REWARDED_ZONE.replace(/[^a-zA-Z0-9_]/g, "")}`;
}

let sdkLoadPromise: Promise<void> | null = null;

function loadMonetagSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${MONETAG_TAG_HOST}"]`);
    const script = existing ?? document.createElement("script");
    script.src = MONETAG_TAG_HOST;
    script.setAttribute("data-zone", REWARDED_ZONE);
    script.setAttribute("data-sdk", rewardedShowFnName());
    script.setAttribute("data-cfasync", "false");
    script.async = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => {
      sdkLoadPromise = null;
      reject(new Error("Monetag SDK failed to load"));
    });
    if (!existing) (document.body || document.documentElement).appendChild(script);
  });
  return sdkLoadPromise;
}

/** Show a rewarded ad on web using Monetag SDK. */
async function showWebRewardedAd(): Promise<void> {
  await loadMonetagSdk();
  const fn = (window as unknown as Record<string, unknown>)[rewardedShowFnName()] as
    MonetagShowFn | undefined;
  if (typeof fn !== "function") {
    throw new Error("Rewarded ad unavailable — SDK did not register its show function");
  }
  await fn();
}

/* ------------------------------------------------------------------ */
/*  Shared: show a rewarded ad on any platform                         */
/* ------------------------------------------------------------------ */

/** When the last rewarded ad was actually completed (epoch ms, 0 = never). */
let lastRewardedCompletedAt = 0;
/** When the last interstitial was actually shown (epoch ms, 0 = never). */
let lastInterstitialShownAt = 0;

async function showRewardedAdUnified(): Promise<boolean> {
  if (isNativeAds()) {
    await waitForNativeAdsInit();
    if (!(await isNativeAdsInitialized())) {
      throw new Error(`INIT FAILED: ${getNativeAdsInitError() ?? "unknown reason"}`);
    }
    const result = await showNativeRewarded();
    if (result.completed) lastRewardedCompletedAt = Date.now();
    return result.completed;
  }
  // Web fallback
  try {
    await showWebRewardedAd();
    lastRewardedCompletedAt = Date.now();
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Countdown formatter                                                */
/* ------------------------------------------------------------------ */

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

/* ------------------------------------------------------------------ */
/*  FreeBoostButton — rewarded ad → premium perk unlock                */
/*                                                                         */
/*  "Watch an ad for a Free Boost" — this is the rewarded unlock path    */
/*  for the premium perk: available after the daily free chest has been  */
/*  claimed, each completed ad rolls one bonus chest (bonus XP or an     */
/*  equipment item). Unlimited — gated only by the 90-second cooldown —  */
/*  and independent of the once-per-day free chest.                     */
/* ------------------------------------------------------------------ */

export function FreeBoostButton({
  onReward,
}: {
  onReward?: (treasure: TreasureReward | null) => void;
}) {
  const { t } = useTranslation();
  useGame(); // re-render when the daily-chest claim state changes
  const [state, setState] = useState<"idle" | "loading">("idle");
  const [cooldownLeft, setCooldownLeft] = useState(() => adRewardCooldownRemaining(AD_COOLDOWN_MS));
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
      const completed = await showRewardedAdUnified();
      if (!completed) {
        // Skipped, closed early, failed to load, or failed to show — no perk.
        if (mounted.current) {
          toast.error(
            t("ads.notCompleted", "The blessing did not complete — no reward was granted."),
          );
        }
        return;
      }
      // Only grant the reward AFTER the ad completed successfully
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
    } catch (e) {
      if (mounted.current) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(
          t("ads.unavailable", "The blessing could not be summoned: {{reason}}", {
            reason: msg,
          }),
        );
      }
    } finally {
      if (mounted.current) setState("idle");
    }
  }, [state, t, onReward]);

  const label =
    state === "loading"
      ? t("ads.summoning", "Summoning…")
      : dailyClaimed
        ? t("ads.freeBoost", "Free Boost — Watch an Ad")
        : t("ads.boostLocked", "Finish a quest or trial to unlock today's Free Boost");

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={state !== "idle" || cooldownLeft > 0 || !dailyClaimed}
      className="btn-arcane-boost mt-4"
      aria-disabled={state !== "idle" || cooldownLeft > 0 || !dailyClaimed}
    >
      {dailyClaimed ? <Sparkles className="size-4" /> : <Gift className="size-4" />}
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

/* ------------------------------------------------------------------ */
/*  Interstitial ad — called at natural transition points              */
/*                                                                         */
/*  Shows a non-rewarded interstitial ad, used INSTEAD of a banner. On  */
/*  native it uses Unity LevelPlay; on web it is a no-op. Fire-and-     */
/*  forget: errors are logged but never block the user flow, and the    */
/*  call is rate-limited so the ad stays at genuine transitions.        */
/* ------------------------------------------------------------------ */

export async function showInterstitialAd(): Promise<void> {
  const now = Date.now();
  // Never let interstitials become a fixture: at most one every two minutes,
  // and never right after a rewarded ad has just been watched.
  if (now - lastInterstitialShownAt < INTERSTITIAL_COOLDOWN_MS) return;
  if (now - lastRewardedCompletedAt < INTERSTITIAL_AFTER_REWARDED_QUIET_MS) return;
  lastInterstitialShownAt = now;

  try {
    if (isNativeAds()) {
      await showNativeInterstitial();
    }
    // Web interstitials not implemented (no Monetag interstitial zone configured)
  } catch (err) {
    console.warn("[aethora-ads] interstitial failed:", err);
  }
}
