import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { completeQuest } from "@/lib/game-store";

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

/**
 * "Watch an ad for a blessing" — plays a Monetag rewarded ad and, on
 * completion, seals the daily blessing quest (+XP) through the same
 * authoritative path as every other quest, so the reward survives
 * logout/login like all progression.
 */
export function MonetagRewardedButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const onClick = useCallback(async () => {
    if (state !== "idle") return;
    setState("loading");
    try {
      await showRewardedAd();
      // Ad watched — grant the blessing. Idempotent server-side (daily UNIQUE).
      const result = await completeQuest("daily-blessing", 25, {});
      if (result && !mounted.current) return;
      if (result) {
        toast.success(t("ads.blessingEarned", "A blessing settles upon you · +25 XP"));
      } else {
        toast(t("ads.blessingAlready", "Today's blessing is already sealed."));
      }
    } catch {
      if (mounted.current) {
        toast.error(
          t("ads.blessingFailed", "The blessing did not answer. Please try again."),
        );
      }
    } finally {
      if (mounted.current) setState("idle");
    }
  }, [state, t, navigate]);

  const label =
    state === "loading"
      ? t("ads.summoning", "Summoning…")
      : state === "playing"
        ? t("ads.watching", "Watch closely…")
        : t("ads.watchReward", "Watch an ad for a blessing");

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={state !== "idle"}
      className="rune-button mt-3 inline-flex items-center gap-2 px-4 py-2 text-[0.65rem] uppercase tracking-[0.2em] disabled:opacity-60"
    >
      <Sparkles className="size-3.5" />
      {label}
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
