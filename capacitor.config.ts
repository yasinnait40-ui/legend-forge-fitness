import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for the AETHORA Android build.
 *
 * webDir: points to the client-only SPA output from `vite build --config vite.config.android.ts`.
 * server.url: REMOVED — the production Android app bundles assets locally.
 *
 * ---------------------------------------------------------------------------
 * Unity LevelPlay (Ads Mediation) — production configuration
 * ---------------------------------------------------------------------------
 * The App Key and ad unit IDs below are the real production values synced into
 * the APK by `bunx cap sync android` (they end up in
 * android/app/src/main/assets/capacitor.config.json and are read by
 * AethoraAdsPlugin.java). Ad identifiers are public client-side values — they
 * ship inside every APK — so they live in source control rather than in CI
 * variables. Never put a Unity *secret* here.
 *
 * Only two ad formats are used:
 *   - Rewarded (`rewardedAdUnitId`)     → unlocks premium perks (Free Boost).
 *   - Interstitial (`interstitialAdUnitId`) → shown only at natural transitions
 *     (trial / boss victory). There is deliberately NO banner ad unit: the
 *     plugin no longer implements banners, so nothing can pin an ad to the UI.
 *
 * testMode is hard-disabled in source. Test mode must only ever be enabled by
 * passing `{ testMode: true }` to `AethoraAds.initialize()` from a debug build.
 */
const config: CapacitorConfig = {
  appId: "com.aethora.app",
  appName: "Aethora",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    AethoraAds: {
      // LevelPlay App Key — levelplay.unity.com → Apps → App Key.
      appKey: "28280b85d",
      // LevelPlay ad unit IDs (Rewarded + Interstitial only).
      rewardedAdUnitId: "btgfo2fi6m24q9vd",
      interstitialAdUnitId: "f879o6uemgg4d59z",
      // Production: test mode OFF.
      testMode: false,
    },
  },
};

export default config;
