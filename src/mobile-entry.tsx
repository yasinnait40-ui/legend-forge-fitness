import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { initNativeAds } from "@/lib/native-ads";
import { Capacitor } from "@capacitor/core";

import "./styles.css";

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

if (Capacitor.isNativePlatform()) {
  initNativeAds();
}