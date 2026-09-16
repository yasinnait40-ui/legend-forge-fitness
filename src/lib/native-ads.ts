/**
 * Native ads bridge for the AethoraAds Capacitor plugin (Unity LevelPlay).
 *
 * On native (Android/iOS): uses the Capacitor bridge to call the Kotlin/Java plugin.
 * On web: provides no-op stubs so existing code can call these without crashes.
 *
 * Only two formats exist — rewarded (premium perk unlocks) and interstitial
 * (natural transitions). Banners are intentionally unsupported.
 *
 * Configuration comes from capacitor.config.ts → `plugins.AethoraAds` →
 * which the native plugin reads at runtime. JS overrides are also accepted
 * in the `initialize()` call.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

/* ------------------------------------------------------------------ */
/*  Plugin interface (mirrors AethoraAdsPlugin.kt methods)             */
/* ------------------------------------------------------------------ */

export interface AethoraAdsConfig {
  appKey?: string;
  rewardedAdUnitId?: string;
  interstitialAdUnitId?: string;
  testMode?: boolean;
}

export interface RewardResult {
  completed: boolean;
  rewardName?: string;
  rewardAmount?: number;
}

export interface NativeAdPlugin {
  initialize(config: AethoraAdsConfig): Promise<{ ok: boolean; version: string }>;
  showInterstitial(options: { adUnitId?: string }): Promise<{ shown: boolean }>;
  showRewarded(options: { adUnitId?: string }): Promise<RewardResult>;
  loadRewarded(options: { adUnitId?: string }): Promise<{ loaded: boolean }>;
  isRewardedReady(): Promise<{ ready: boolean }>;
  launchTestSuite(): Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Web fallback (no-op)                                               */
/* ------------------------------------------------------------------ */

const WebAdPlugin: NativeAdPlugin = {
  async initialize() {
    return { ok: false, version: "web-fallback" };
  },
  async showInterstitial() {
    return { shown: false };
  },
  async showRewarded() {
    return { completed: false };
  },
  async loadRewarded() {
    return { loaded: false };
  },
  async isRewardedReady() {
    return { ready: false };
  },
  async launchTestSuite() {},
};

/* ------------------------------------------------------------------ */
/*  Plugin registration                                               */
/* ------------------------------------------------------------------ */

const AethoraAds: NativeAdPlugin = Capacitor.isNativePlatform()
  ? registerPlugin<NativeAdPlugin>("AethoraAds")
  : WebAdPlugin;

/** Whether running on a native platform (Android/iOS via Capacitor). */
export function isNativeAds(): boolean {
  return Capacitor.isNativePlatform();
}

/* ------------------------------------------------------------------ */
/*  Init state + readiness gate                                        */
/* ------------------------------------------------------------------ */

/**
 * Single shared init promise. `null` = init has not started yet.
 * Resolves `true` when the native plugin reports success, `false` on
 * failure (never rejects, so awaiters need no try/catch). A failed init
 * is retryable: the next caller gets a fresh native init attempt.
 */
let initPromise: Promise<boolean> | null = null;
let lastInitError: string | null = null;

/** Whether a native init has been started (successfully or not). */
export function isNativeAdsInitStarted(): boolean {
  return isNativeAds() && initPromise !== null;
}

/**
 * Resolve once LevelPlay init has finished (or the timeout expired).
 * `true` = safe to call the show / load methods. Auto-starts init when no
 * entry-point call has happened yet, so ad calls can never race it.
 */
export function waitForNativeAdsInit(timeoutMs = 10_000): Promise<boolean> {
  if (!isNativeAds()) return Promise.resolve(false);
  if (!initPromise) void initNativeAds();
  if (timeoutMs <= 0) return initPromise!;
  return Promise.race([
    initPromise!,
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
  ]);
}

/**
 * Initialize LevelPlay ads. Safe to call multiple times (idempotent):
 * concurrent and repeat calls share one native init.
 * On web this is a no-op resolving false.
 *
 * NOTE: a failure here is almost always a Unity-dashboard config problem,
 * not a code problem. Error 2110 "Bad Request - 400" from LevelPlay init
 * typically means the appKey is not a valid LevelPlay App Key (e.g. a
 * Unity Ads Game ID was used instead — they are different identifiers).
 */
export async function initNativeAds(config?: AethoraAdsConfig): Promise<boolean> {
  if (!isNativeAds()) return false;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const result = await AethoraAds.initialize(config ?? {});
        console.log("[aethora-ads] LevelPlay initialized, SDK version:", result.version);
        lastInitError = null;
        return true;
      } catch (err) {
        lastInitError = err instanceof Error ? err.message : String(err);
        console.error("[aethora-ads] LevelPlay init failed:", err);
        initPromise = null; // allow retry on the next ad call
        return false;
      }
    })();
  }
  return initPromise;
}

/** Returns the last init failure reason, if any (null if init succeeded or hasn't run). */
export function getNativeAdsInitError(): string | null {
  return lastInitError;
}

/** Whether native ad initialization has completed successfully. */
export async function isNativeAdsInitialized(): Promise<boolean> {
  if (!isNativeAds()) return false;
  if (!initPromise) return false;
  return initPromise;
}

/**
 * Show a rewarded ad and return whether the user completed it.
 * The caller should only grant a reward when `completed` is true.
 * On web, this always resolves { completed: false }.
 */
export async function showNativeRewarded(adUnitId?: string): Promise<RewardResult> {
  if (!isNativeAds()) return { completed: false };
  // Never show before the SDK finished initializing.
  const ready = await waitForNativeAdsInit();
  if (!ready) return { completed: false };
  return AethoraAds.showRewarded(adUnitId ? { adUnitId } : {});
}

/**
 * Show an interstitial ad. Returns whether it was displayed.
 * On web, returns { shown: false }.
 */
export async function showNativeInterstitial(adUnitId?: string): Promise<{ shown: boolean }> {
  if (!isNativeAds()) return { shown: false };
  // Never show before the SDK finished initializing.
  const ready = await waitForNativeAdsInit();
  if (!ready) return { shown: false };
  return AethoraAds.showInterstitial(adUnitId ? { adUnitId } : {});
}

/** Launch the LevelPlay test suite (a diagnostic tool only — it does not turn on test-mode ads). */
export async function launchTestSuite(): Promise<void> {
  if (!isNativeAds()) return;
  await AethoraAds.launchTestSuite();
}
