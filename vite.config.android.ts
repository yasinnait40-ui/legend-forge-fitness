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
  // Vite resolves publicDir relative to root; with root=android-spa it would
  // look for android-spa/public/ (missing), dropping ALL static assets
  // (splash art, characters, audio, icons) from dist/. Point it back at the
  // repo-root public/ directory explicitly.
  publicDir: "../public",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  optimizeDeps: {
    // Same Capacitor/Vite pre-bundler incompatibility as the main config.
    exclude: ["@capacitor/core"],
  },
  build: {
    // Relative to root (android-spa/) — resolve to the project-root dist/
    // that capacitor.config.ts expects as webDir.
    outDir: "../dist",
    emptyOutDir: true,
    target: "es2020",
  },
  server: {
    hmr: false,
  },
});
