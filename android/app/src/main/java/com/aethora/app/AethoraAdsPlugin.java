package com.aethora.app;

import android.app.Activity;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

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
import com.unity3d.mediation.banner.LevelPlayAdSize;
import com.unity3d.mediation.banner.LevelPlayBannerAdView;
import com.unity3d.mediation.banner.LevelPlayBannerAdViewListener;
import com.unity3d.mediation.interstitial.LevelPlayInterstitialAd;
import com.unity3d.mediation.interstitial.LevelPlayInterstitialAdListener;
import com.unity3d.mediation.rewarded.LevelPlayReward;
import com.unity3d.mediation.rewarded.LevelPlayRewardedAd;
import com.unity3d.mediation.rewarded.LevelPlayRewardedAdListener;

import org.json.JSONObject;

/**
 * Capacitor plugin providing Unity LevelPlay ad integration for AETHORA.
 *
 * Bridge methods mirror the JS API in src/lib/native-ads.ts.
 * Configuration is read from capacitor.config.json → plugins.AethoraAds.
 */
@CapacitorPlugin(name = "AethoraAds")
public class AethoraAdsPlugin extends Plugin {

    private static final String TAG = "AethoraAds";

    // LevelPlay ad objects
    @Nullable private LevelPlayRewardedAd rewardedAd;
    @Nullable private LevelPlayInterstitialAd interstitialAd;
    @Nullable private LevelPlayBannerAdView bannerAdView;

    // Banner container added to the activity
    @Nullable private FrameLayout bannerContainer;

    // State
    private boolean initialized = false;
    private boolean rewardedReady = false;
    private boolean interstitialReady = false;

    // Ad unit IDs from config
    private String rewardedAdUnitId = "";
    private String interstitialAdUnitId = "";
    private String bannerAdUnitId = "";

    /* ------------------------------------------------------------------ */
    /*  Lifecycle                                                         */
    /* ------------------------------------------------------------------ */

    @Override
    public void load() {
        super.load();
        // Read plugin config from capacitor.config.json
        JSONObject config = getConfig().getPlugin("AethoraAds");
        if (config != null) {
            rewardedAdUnitId = config.optString("rewardedAdUnitId", "");
            interstitialAdUnitId = config.optString("interstitialAdUnitId", "");
            bannerAdUnitId = config.optString("bannerAdUnitId", "");
        }
    }

    @Override
    public void handleOnDestroy() {
        if (bannerAdView != null) {
            bannerAdView.destroy();
            bannerAdView = null;
        }
        super.handleOnDestroy();
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

        String appKey = call.getString("appKey", getConfig().getPlugin("AethoraAds")
                .optString("appKey", ""));
        boolean testMode = call.getBoolean("testMode", getConfig().getPlugin("AethoraAds")
                .optBoolean("testMode", true));

        if (appKey.isEmpty()) {
            call.reject("LevelPlay app key is not configured. Set UNITY_LEVELPLAY_APP_KEY in capacitor.config.ts.");
            return;
        }

        // Override ad unit IDs if passed from JS
        String rId = call.getString("rewardedAdUnitId", null);
        if (rId != null && !rId.isEmpty()) rewardedAdUnitId = rId;
        String iId = call.getString("interstitialAdUnitId", null);
        if (iId != null && !iId.isEmpty()) interstitialAdUnitId = iId;
        String bId = call.getString("bannerAdUnitId", null);
        if (bId != null && !bId.isEmpty()) bannerAdUnitId = bId;

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

        // Build init request
        LevelPlayInitRequest.Builder builder = new LevelPlayInitRequest.Builder(appKey);
        LevelPlayInitRequest request = builder.build();

        LevelPlay.init(activity, request, new LevelPlayInitListener() {
            @Override
            public void onInitSuccess(@NonNull LevelPlayConfiguration configuration) {
                initialized = true;
                Log.i(TAG, "LevelPlay initialized successfully");
                JSObject result = new JSObject();
                result.put("ok", true);
                result.put("version", LevelPlay.getSdkVersion());
                call.resolve(result);
            }

            @Override
            public void onInitFailed(@NonNull LevelPlayInitError error) {
                Log.e(TAG, "LevelPlay init failed: " + error.getErrorCode() + " — " + error.getErrorMessage());
                call.reject("LevelPlay init failed: " + error.getErrorMessage());
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
    /*  Banner ads                                                        */
    /* ------------------------------------------------------------------ */

    @PluginMethod
    public void showBanner(PluginCall call) {
        String unitId = getAdUnitId(call, "adUnitId", bannerAdUnitId);
        if (unitId.isEmpty()) { call.reject("Banner ad unit ID not configured."); return; }

        String position = call.getString("position", "bottom");
        Activity activity = getActivity();
        if (activity == null) { call.reject("Activity not available"); return; }

        // Remove existing banner
        destroyBannerView();

        activity.runOnUiThread(() -> {
            LevelPlayAdSize adSize = LevelPlayAdSize.BANNER;
            LevelPlayBannerAdView.Config config = new LevelPlayBannerAdView.Config(adSize, null, null);
            bannerAdView = new LevelPlayBannerAdView(activity, unitId, config);

            bannerAdView.setBannerListener(new LevelPlayBannerAdViewListener() {
                @Override public void onAdLoaded(@NonNull LevelPlayAdInfo adInfo) {
                    JSObject res = new JSObject();
                    res.put("shown", true);
                    call.resolve(res);
                }
                @Override public void onAdLoadFailed(@NonNull LevelPlayAdError error) {
                    call.reject("Banner load failed: " + error.getErrorMessage());
                }
                @Override public void onAdDisplayed(@NonNull LevelPlayAdInfo adInfo) {}
                @Override public void onAdDisplayFailed(@NonNull LevelPlayAdError error, @NonNull LevelPlayAdInfo adInfo) {}
                @Override public void onAdClicked(@NonNull LevelPlayAdInfo adInfo) {}
                @Override public void onAdCollapsed(@NonNull LevelPlayAdInfo adInfo) {}
                @Override public void onAdExpanded(@NonNull LevelPlayAdInfo adInfo) {}
                @Override public void onAdLeftApplication(@NonNull LevelPlayAdInfo adInfo) {}
            });

            // Add banner to a FrameLayout overlay
            bannerContainer = new FrameLayout(activity);
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
            );
            params.gravity = "top".equals(position) ? Gravity.TOP : Gravity.BOTTOM;
            bannerContainer.addView(bannerAdView, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
            ));

            // Add to activity's content view
            FrameLayout activityContent = activity.findViewById(android.R.id.content);
            if (activityContent != null) {
                activityContent.addView(bannerContainer, params);
            }

            bannerAdView.loadAd();
        });
    }

    @PluginMethod
    public void hideBanner(PluginCall call) {
        activity.runOnUiThread(() -> {
            if (bannerContainer != null) {
                bannerContainer.setVisibility(View.GONE);
            }
        });
        call.resolve();
    }

    @PluginMethod
    public void destroyBanner(PluginCall call) {
        activity.runOnUiThread(() -> destroyBannerView());
        call.resolve();
    }

    private void destroyBannerView() {
        if (bannerAdView != null) {
            bannerAdView.destroy();
            bannerAdView = null;
        }
        if (bannerContainer != null) {
            ViewGroup parent = (ViewGroup) bannerContainer.getParent();
            if (parent != null) parent.removeView(bannerContainer);
            bannerContainer = null;
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Test suite                                                        */
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
