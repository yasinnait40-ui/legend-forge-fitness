import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { initNativeAds } from "@/lib/native-ads";
import { Capacitor } from "@capacitor/core";

import "./styles.css";

/* Native ads: fire the LevelPlay init as soon as the SPA boots (fire-and-
 * forget). showNativeRewarded / showNativeInterstitial await
 * waitForNativeAdsInit() internally, so they can never race this. */
import { initNativeAds, isNativeAds } from "./lib/native-ads";

const router = getRouter();

const rootRoute = (router as any).routeTree;
if (rootRoute?.options?.shellComponent) {
  rootRoute.options.shellComponent = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

if (isNativeAds()) {
  void initNativeAds();
}
