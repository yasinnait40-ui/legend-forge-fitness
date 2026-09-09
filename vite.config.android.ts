/**
 * Standalone Vite config for the Capacitor Android build.
 *
 * Uses plain @vitejs/plugin-react + Tailwind + tsconfig paths.
 * No TanStack Start, no nitro, no SSR — produces a pure client-side SPA.
 *
 * The SPA shell lives at android-spa/index.html (NOT the repo root — a root
 * index.html would be picked up by the main TanStack Start web build as its
 * renderer template and break SSR).
 *
 * Usage:
 *   vite build --config vite.config.android.ts
 *   → outputs to dist/ (index.html + assets/)
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  root: "android-spa",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  optimizeDeps: {
    // Same Capacitor/Vite pre-bundler incompatibility as the main config.
    exclude: ["@capacitor/core"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
  },
  server: {
    hmr: false,
  },
});
