/**
 * Standalone client-only entry point for the Capacitor Android build.
 *
 * This completely bypasses TanStack Start's SSR server, createServerFn,
 * and prerender pipeline. It renders the existing TanStack Router + React
 * Query tree directly into the DOM, exactly as a classic SPA.
 *
 * The Arcane Guide (server function) will not work in this mode because
 * there is no server to handle /_serverFn/* requests. It degrades gracefully.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";

/* Side-effect: imports Tailwind + design tokens + resets */
import "./styles.css";

const router = getRouter();

/**
 * Strip the server-rendered shell (<html>/<body> wrapper) so client-only
 * rendering does not produce nested <html> tags inside the WebView.
 */
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
