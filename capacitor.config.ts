import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for AETHORA Android build.
 *
 * webDir: points to the client-only SPA output from `vite build --config vite.config.android.ts`.
 * server.url: REMOVED — the production Android app bundles assets locally.
 *
 * Ads plugin config is read from environment variables at build/sync time.
 * Set these before `bunx cap sync android`:
 *   UNITY_LEVELPLAY_APP_KEY    — Unity LevelPlay app key (required)
 *   UNITY_REWARDED_AD_UNIT_ID  — Rewarded ad unit ID (required for ads)
 *   UNITY_INTERSTITIAL_AD_UNIT_ID — Interstitial ad unit ID (optional)
 *   UNITY_BANNER_AD_UNIT_ID    — Banner ad unit ID (optional)
 *   UNITY_ADS_TEST_MODE        — "true" or "false" (default: true)
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
      appKey: process.env.UNITY_LEVELPLAY_APP_KEY ?? "800370118",
      rewardedAdUnitId: process.env.UNITY_REWARDED_AD_UNIT_ID ?? "Rewarded_Android",
      interstitialAdUnitId: process.env.UNITY_INTERSTITIAL_AD_UNIT_ID ?? "Interstitial_Android",
      bannerAdUnitId: "",
      testMode: process.env.UNITY_ADS_TEST_MODE !== "false",
    },
  },
};

export default config;
