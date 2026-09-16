package com.aethora.app;

import android.app.Activity;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.unity3d.mediation.LevelPlay;
import com.unity3d.mediation.LevelPlayAdInfo;
import com.unity3d.mediation.LevelPlayAdError;
import com.unity3d.mediation.LevelPlayConfiguration;
import com.unity3d.mediation.LevelPlayInitError;
import com.unity3d.mediation.LevelPlayInitListener;
import com.unity3d.mediation.LevelPlayInitRequest;
import com.unity3d.mediation.interstitial.LevelPlayInterstitialAd;
import com.unity3d.mediation.interstitial.LevelPlayInterstitialAdListener;
import com.unity3d.mediation.rewarded.LevelPlayReward;
import com.unity3d.mediation.rewarded.LevelPlayRewardedAd;
import com.unity3d.mediation.rewarded.LevelPlayRewardedAdListener;

/**
 * Capacitor plugin providing Unity LevelPlay ad integration for AETHORA.
 *
 * Bridge methods mirror the JS API in src/lib/native-ads.ts.
 * Configuration is read from capacitor.config.json → plugins.AethoraAds.
 *
 * Only two formats are implemented: rewarded (premium perk unlocks) and
 * interstitial (natural transitions). Banner support was removed on purpose —
 * no ad may be permanently attached to the app chrome.
 */
@CapacitorPlugin(name = "AethoraAds")
public class AethoraAdsPlugin extends Plugin {

    private static final String TAG = "AethoraAds";

    // LevelPlay ad objects
    @Nullable private LevelPlayRewardedAd rewardedAd;
    @Nullable private LevelPlayInterstitialAd interstitialAd;

    // State
    private boolean initialized = false;
    private boolean rewardedReady = false;
    private boolean interstitialReady = false;

    // Ad unit IDs from config
    private String rewardedAdUnitId = "";
    private String interstitialAdUnitId = "";

    /* ------------------------------------------------------------------ */
    /*  Lifecycle                                                         */
    /* ------------------------------------------------------------------ */

    @Override
    public void load() {
        super.load();
        // Read plugin config from capacitor.config.json — getConfig() returns
        // this plugin's own config section, so values are read directly.
        rewardedAdUnitId = getConfig().getString("rewardedAdUnitId", "");
        interstitialAdUnitId = getConfig().getString("interstitialAdUnitId", "");
    }

    /* ------------------------------------------------------------------ */
    /*  Initialize LevelPlay                                              */
    /* ------------------------------------------------------------------ */

    @PluginMethod
    public void initialize(PluginCall call) {
        if (initialized) {
            call.resolve(buildResult("ok", true, "already-initialized"));
            return;
        }

        String appKey = call.getString("appKey", getConfig().getString("appKey", ""));
        // PRODUCTION DEFAULT IS FALSE. Test mode is only enabled when a caller
        // explicitly passes { testMode: true } — never by default, never from
        // the synced capacitor.config.json.
        boolean testMode = call.getBoolean("testMode", getConfig().getBoolean("testMode", false));

        if (appKey.isEmpty()) {
            call.reject("LevelPlay app key is not configured. Set plugins.AethoraAds.appKey in capacitor.config.ts, then re-run `npx cap sync android`.");
            return;
        }

        // Override ad unit IDs if passed from JS
        String rId = call.getString("rewardedAdUnitId", null);
        if (rId != null && !rId.isEmpty()) rewardedAdUnitId = rId;
        String iId = call.getString("interstitialAdUnitId", null);
        if (iId != null && !iId.isEmpty()) interstitialAdUnitId = iId;

        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        // Test mode: set legacy metadata + enable adapter debug
        if (testMode) {
            LevelPlay.setMetaData("is_test_mode", "true");
            LevelPlay.setAdaptersDebug(true);
        }

        Log.i(TAG, "LevelPlay init starting: appKey=" + appKey
                + " (length=" + appKey.length() + ")"
                + " testMode=" + testMode
                + " sdk=" + LevelPlay.getSdkVersion());

        // Build init request
        LevelPlayInitRequest.Builder builder = new LevelPlayInitRequest.Builder(appKey);
        LevelPlayInitRequest request = builder.build();

        final String usedAppKey = appKey;
        LevelPlay.init(activity, request, new LevelPlayInitListener() {
            @Override
            public void onInitSuccess(@NonNull LevelPlayConfiguration configuration) {
                initialized = true;
                Log.i(TAG, "LevelPlay initialized successfully (appKey=" + usedAppKey + ")");
                JSObject result = new JSObject();
                result.put("ok", true);
                result.put("version", LevelPlay.getSdkVersion());
                call.resolve(result);
            }

            @Override
            public void onInitFailed(@NonNull LevelPlayInitError error) {
                Log.e(TAG, "LevelPlay init failed: code=" + error.getErrorCode()
                        + " message=" + error.getErrorMessage()
                        + " | appKey used=" + usedAppKey
                        + " (length=" + usedAppKey.length() + ")");
                Log.e(TAG, "2110/400 usually means the appKey is NOT a LevelPlay App Key — "
                        + "e.g. a Unity Ads Game ID was passed instead. The LevelPlay App Key "
                        + "is a different identifier (8-12 chars) found in the LevelPlay "
                        + "platform under Apps → Integration → App Key.");
                call.reject("LevelPlay init failed: code=" + error.getErrorCode()
                        + " — " + error.getErrorMessage());
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Rewarded ads                                                      */
    /* ------------------------------------------------------------------ */

    @PluginMethod
    public void loadRewarded(PluginCall call) {
        String unitId = getAdUnitId(call, "adUnitId", rewardedAdUnitId);
        if (unitId.isEmpty()) {
            call.reject("Rewarded ad unit ID not configured.");
            return;
        }

        Activity activity = getActivity();
        if (activity == null) { call.reject("Activity not available"); return; }

        // Create or reuse
        if (rewardedAd == null || !rewardedAd.getAdUnitId().equals(unitId)) {
            rewardedAd = new LevelPlayRewardedAd(unitId);
        }

        rewardedAd.setListener(createRewardedListener(call));
        rewardedAd.loadAd();
    }

    @PluginMethod
    public void showRewarded(PluginCall call) {
        String unitId = getAdUnitId(call, "adUnitId", rewardedAdUnitId);
        if (unitId.isEmpty()) { call.reject("Rewarded ad unit ID not configured."); return; }

        Activity activity = getActivity();
        if (activity == null) { call.reject("Activity not available"); return; }

        // Create if needed
        if (rewardedAd == null || !rewardedAd.getAdUnitId().equals(unitId)) {
            rewardedAd = new LevelPlayRewardedAd(unitId);
            rewardedAd.setListener(createRewardedListener(call));
        }

        if (rewardedAd.isAdReady()) {
            rewardedAd.showAd(activity);
        } else {
            // Load first, then show on loaded
            rewardedAd.setListener(new LevelPlayRewardedAdListener() {
                @Override public void onAdLoaded(@NonNull LevelPlayAdInfo adInfo) {
                    rewardedAd.showAd(activity);
                }
                @Override public void onAdLoadFailed(@NonNull LevelPlayAdError error) {
                    call.reject("Rewarded ad failed to load: " + error.getErrorMessage());
                }
                // Other callbacks are empty for the load-then-show pattern
                @Override public void onAdDisplayed(@NonNull LevelPlayAdInfo adInfo) {}
                @Override public void onAdDisplayFailed(@NonNull LevelPlayAdError error, @NonNull LevelPlayAdInfo adInfo) {}
                @Override public void onAdRewarded(@NonNull LevelPlayReward reward, @NonNull LevelPlayAdInfo adInfo) {}
                @Override public void onAdClosed(@NonNull LevelPlayAdInfo adInfo) {}
                @Override public void onAdClicked(@NonNull LevelPlayAdInfo adInfo) {}
                @Override public void onAdInfoChanged(@NonNull LevelPlayAdInfo adInfo) {}
            });
            rewardedAd.loadAd();
        }
    }

    @PluginMethod
    public void isRewardedReady(PluginCall call) {
        JSObject result = new JSObject();
        result.put("ready", rewardedAd != null && rewardedAd.isAdReady());
        call.resolve(result);
    }

    private LevelPlayRewardedAdListener createRewardedListener(PluginCall pendingCall) {
        return new LevelPlayRewardedAdListener() {
            boolean completed = false;

            @Override public void onAdLoaded(@NonNull LevelPlayAdInfo adInfo) {
                rewardedReady = true;
                Log.d(TAG, "Rewarded ad loaded");
            }
            @Override public void onAdLoadFailed(@NonNull LevelPlayAdError error) {
                rewardedReady = false;
                Log.e(TAG, "Rewarded load failed: " + error.getErrorMessage());
            }
            @Override public void onAdDisplayed(@NonNull LevelPlayAdInfo adInfo) {
                Log.d(TAG, "Rewarded ad displayed");
            }
            @Override public void onAdDisplayFailed(@NonNull LevelPlayAdError error, @NonNull LevelPlayAdInfo adInfo) {
                Log.e(TAG, "Rewarded display failed: " + error.getErrorMessage());
                JSObject res = new JSObject();
                res.put("completed", false);
                pendingCall.resolve(res);
            }
            @Override public void onAdRewarded(@NonNull LevelPlayReward reward, @NonNull LevelPlayAdInfo adInfo) {
                completed = true;
                Log.i(TAG, "Rewarded! name=" + reward.getName() + " amount=" + reward.getAmount());
            }
            @Override public void onAdClosed(@NonNull LevelPlayAdInfo adInfo) {
                rewardedReady = false;
                JSObject res = new JSObject();
                res.put("completed", completed);
                res.put("rewardName", "");
                res.put("rewardAmount", 0);
                pendingCall.resolve(res);
                // Reload for next time
                if (rewardedAd != null) {
                    rewardedAd.setListener(createRewardedListener(pendingCall));
                    rewardedAd.loadAd();
                }
            }
            @Override public void onAdClicked(@NonNull LevelPlayAdInfo adInfo) {}
            @Override public void onAdInfoChanged(@NonNull LevelPlayAdInfo adInfo) {}
        };
    }

    /* ------------------------------------------------------------------ */
    /*  Interstitial ads                                                  */
    /* ------------------------------------------------------------------ */

    @PluginMethod
    public void showInterstitial(PluginCall call) {
        String unitId = getAdUnitId(call, "adUnitId", interstitialAdUnitId);
        if (unitId.isEmpty()) { call.reject("Interstitial ad unit ID not configured."); return; }

        Activity activity = getActivity();
        if (activity == null) { call.reject("Activity not available"); return; }

        if (interstitialAd == null || !interstitialAd.getAdUnitId().equals(unitId)) {
            interstitialAd = new LevelPlayInterstitialAd(unitId);
        }

        interstitialAd.setListener(new LevelPlayInterstitialAdListener() {
            @Override public void onAdLoaded(@NonNull LevelPlayAdInfo adInfo) {
                interstitialReady = true;
                interstitialAd.showAd(activity);
            }
            @Override public void onAdLoadFailed(@NonNull LevelPlayAdError error) {
                call.reject("Interstitial load failed: " + error.getErrorMessage());
            }
            @Override public void onAdDisplayed(@NonNull LevelPlayAdInfo adInfo) {
                JSObject res = new JSObject();
                res.put("shown", true);
                call.resolve(res);
            }
            @Override public void onAdDisplayFailed(@NonNull LevelPlayAdError error, @NonNull LevelPlayAdInfo adInfo) {
                call.reject("Interstitial display failed: " + error.getErrorMessage());
            }
            @Override public void onAdClosed(@NonNull LevelPlayAdInfo adInfo) {
                interstitialReady = false;
                // Reload for next time
                if (interstitialAd != null) interstitialAd.loadAd();
            }
            @Override public void onAdClicked(@NonNull LevelPlayAdInfo adInfo) {}
            @Override public void onAdInfoChanged(@NonNull LevelPlayAdInfo adInfo) {}
        });

        if (interstitialAd.isAdReady()) {
            interstitialAd.showAd(activity);
        } else {
            interstitialAd.loadAd();
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Test suite (diagnostics only — does not enable test-mode ads)      */
    /* ------------------------------------------------------------------ */

    @PluginMethod
    public void launchTestSuite(PluginCall call) {
        LevelPlay.launchTestSuite(getActivity());
        call.resolve();
    }

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                           */
    /* ------------------------------------------------------------------ */

    private static String getAdUnitId(PluginCall call, String key, String defaultId) {
        String id = call.getString(key, null);
        if (id != null && !id.isEmpty()) return id;
        return defaultId;
    }

    private static JSObject buildResult(String key, Object value, String extra) {
        JSObject obj = new JSObject();
        obj.put(key, value);
        if (extra != null) obj.put("message", extra);
        return obj;
    }
}
