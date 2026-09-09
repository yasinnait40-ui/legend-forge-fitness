# AETHORA — Android Build Guide

This document covers building, signing, and publishing the AETHORA Android app using Capacitor + Unity LevelPlay.

## Prerequisites

- **Node.js 20+** and **Bun**
- **Java 17** (Temurin recommended)
- **Android SDK** with build-tools (via Android Studio or `sdkmanager`)

## Quick Start (Local Build)

```bash
# 1. Install deps
bun install

# 2. Build the client SPA
bunx vite build --config vite.config.android.ts

# 3. Sync web assets to Android
bunx cap sync android

# 4. Build debug APK
cd android
./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

## Release Build (Signed AAB)

1. **Create a keystore** (once):
   ```bash
   keytool -genkey -v -keystore release.keystore \
     -alias aethora -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Decode the keystore** in CI from the base64 secret (GitHub Actions does this automatically).

3. **Build:**
   ```bash
   cd android
   ANDROID_KEYSTORE_PATH=../release.keystore \
   ANDROID_KEYSTORE_PASSWORD=yourpassword \
   ANDROID_KEY_ALIAS=aethora \
   ANDROID_KEY_PASSWORD=yourpassword \
   ./gradlew bundleRelease
   # → app/build/outputs/bundle/release/app-release.aab
   ```

## GitHub Actions Workflow

The workflow at `.github/workflows/build-android.yml` runs on push to `main` and on manual dispatch.

### Required GitHub Secrets (for release builds)

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded release keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias (e.g., `aethora`) |
| `ANDROID_KEY_PASSWORD` | Key password |

Generate the base64 value:
```bash
base64 -w 0 release.keystore
```

### Required GitHub Variables (for ad configuration)

| Variable | Description | Example |
|----------|-------------|---------|
| `UNITY_LEVELPLAY_APP_KEY` | Unity LevelPlay app key from your dashboard | `2228794` |
| `UNITY_REWARDED_AD_UNIT_ID` | Rewarded ad unit ID | `YOUR_REWARDED_ID` |
| `UNITY_INTERSTITIAL_AD_UNIT_ID` | Interstitial ad unit ID (optional) | `YOUR_INTERSTITIAL_ID` |
| `UNITY_BANNER_AD_UNIT_ID` | Banner ad unit ID (optional) | `YOUR_BANNER_ID` |
| `UNITY_ADS_TEST_MODE` | `"true"` for development, `"false"` for production | `true` |

Set these in your repository: **Settings → Secrets and variables → Actions → Variables**.

## Unity LevelPlay Setup

1. Create a Unity LevelPlay account at https://dashboard.unity.com
2. Create a new app in the LevelPlay dashboard
3. Add ad units (Rewarded, Interstitial, Banner)
4. Copy your **App Key** and **Ad Unit IDs**
5. For testing: register test devices in the LevelPlay dashboard
6. For production: configure your monetization waterfall/placement

### Test Mode

When `UNITY_ADS_TEST_MODE` is `true` (default), the plugin calls:
- `LevelPlay.setMetaData("is_test_mode", "true")`
- `LevelPlay.setAdaptersDebug(true)`

These enable test ad behavior. For full control, use the **LevelPlay Integration Test Suite** — it's accessible via `AethoraAds.launchTestSuite()` from the JavaScript bridge.

### JavaScript API

```ts
import { initNativeAds, showNativeRewarded, showNativeInterstitial } from "@/lib/native-ads";
import { Capacitor } from "@capacitor/core";

// Initialize at app start (idempotent)
if (Capacitor.isNativePlatform()) {
  await initNativeAds();
}

// Show rewarded ad — only grant reward when completed=true
const result = await showNativeRewarded();
if (result.completed) {
  // Grant in-app reward
}

// Show interstitial (fire-and-forget)
await showNativeInterstitial();
```

## Architecture

```
vite.config.android.ts     → Standalone Vite config (no SSR)
src/mobile-entry.tsx        → Client-only SPA entry point
src/lib/native-ads.ts       → JS bridge (Capacitor plugin wrapper)
capacitor.config.ts         → Android config + ad plugin config
android/app/.../AethoraAdsPlugin.java → Native LevelPlay integration
```

### Key differences from the web build

| | Web (TanStack Start) | Android (Capacitor) |
|---|---|---|
| Entry | TanStack Start SSR + prerender | `mobile-entry.tsx` → plain SPA |
| Server functions | Work (Nitro/Cloudflare) | **Unavailable** (Arcane Guide degrades gracefully) |
| Ads | Monetag web SDK | Unity LevelPlay native SDK |
| Bundle | SSR worker + static assets | Static SPA only |

## Troubleshooting

- **Blank screen**: Ensure `bunx vite build --config vite.config.android.ts` produced `dist/index.html`
- **Ad not showing**: Check `UNITY_LEVELPLAY_APP_KEY` is set; verify device is registered as test in LevelPlay dashboard
- **Build fails**: Run `bunx cap sync android` first — it copies web assets and generates the Capacitor config
