import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aethora.app",
  appName: "Aethora",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    AethoraAds: {
      appKey: "27d91be0d",
      rewardedAdUnitId: "Rewarded_Android",
      interstitialAdUnitId: 
      bannerAdUnitId: "",
      testMode: true,
    },
  },
};

export default config;
