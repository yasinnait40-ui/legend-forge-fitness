/**
 * Native ads bridge for the AethoraAds Capacitor plugin (Unity LevelPlay).
 *
 * On native (Android/iOS): uses the Capacitor bridge to call the Kotlin/Java plugin.
 * On web: provides no-op stubs so existing code can call these without crashes.
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
  bannerAdUnitId?: string;
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
  showBanner(options: {
    adUnitId?: string;
    position?: "top" | "bottom";
  }): Promise<{ shown: boolean }>;
  hideBanner(): Promise<void>;
  destroyBanner(): Promise<void>;
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
  async showBanner() {
    return { shown: false };
  },
  async hideBanner() {},
  async destroyBanner() {},
  async launchTestSuite() {},
};

/* ------------------------------------------------------------------ */
/*  Plugin registration                                               */
/* ------------------------------------------------------------------ */

const AethoraAds: NativeAdPlugin =
  Capacitor.isNativePlatform()
    ? registerPlugin<NativeAdPlugin>("AethoraAds")
    : WebAdPlugin;

/** Whether running on a native platform (Android/iOS via Capacitor). */
export function isNativeAds(): boolean {
  return Capacitor.isNativePlatform();
}

/* ------------------------------------------------------------------ */
/*  Convenience wrappers                                              */
/* ------------------------------------------------------------------ */

let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize LevelPlay ads. Safe to call multiple times (idempotent).
 * On web this is a no-op.
 */
export async function initNativeAds(config?: AethoraAdsConfig): Promise<void> {
  if (initialized || !isNativeAds()) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const result = await AethoraAds.initialize(config ?? {});
      initialized = result.ok;
    } catch (err) {
      console.warn("[aethora-ads] native init failed:", err);
    }
  })();
  return initPromise;
}

/**
 * Wait for native ad initialization to complete (if in progress or not
 * yet started). Safe to call even if initNativeAds() was never invoked.
 */
export async function waitForNativeAdsInit(): Promise<void> {
  if (initialized || !isNativeAds()) return;
  if (initPromise) {
    await initPromise;
  }
}

/**
 * Show a rewarded ad and return whether the user completed it.
 * The caller should only grant a reward when `completed` is true.
 * On web, this always resolves { completed: false }.
 */
export async function showNativeRewarded(adUnitId?: string): Promise<RewardResult> {
  if (!isNativeAds()) return { completed: false };
  return AethoraAds.showRewarded(adUnitId ? { adUnitId } : {});
}

/**
 * Show an interstitial ad. Returns whether it was displayed.
 * On web, returns { shown: false }.
 */
export async function showNativeInterstitial(adUnitId?: string): Promise<{ shown: boolean }> {
  if (!isNativeAds()) return { shown: false };
  return AethoraAds.showInterstitial(adUnitId ? { adUnitId } : {});
}

/**
 * Show a banner ad. On web, this is a no-op.
 */
export async function showNativeBanner(
  adUnitId?: string,
  position: "top" | "bottom" = "bottom",
): Promise<{ shown: boolean }> {
  if (!isNativeAds()) return { shown: false };
  const opts: { adUnitId?: string; position: "top" | "bottom" } = { position };
  if (adUnitId) opts.adUnitId = adUnitId;
  return AethoraAds.showBanner(opts);
}

/** Hide the current banner ad. */
export async function hideNativeBanner(): Promise<void> {
  if (!isNativeAds()) return;
  await AethoraAds.hideBanner();
}

/** Destroy and remove the banner view. */
export async function destroyNativeBanner(): Promise<void> {
  if (!isNativeAds()) return;
  await AethoraAds.destroyBanner();
}

/** Launch the LevelPlay test suite (for development). */
export async function launchTestSuite(): Promise<void> {
  if (!isNativeAds()) return;
  await AethoraAds.launchTestSuite();
}