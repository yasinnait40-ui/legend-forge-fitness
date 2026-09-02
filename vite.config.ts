// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

const env = loadEnv("development", process.cwd(), "");

export default defineConfig({
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        env["VITE_SUPABASE_URL"] || env["NEXT_PUBLIC_SUPABASE_URL"] || env["SUPABASE_URL"] || "",
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
          env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ||
          env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ||
          env["SUPABASE_PUBLISHABLE_KEY"] ||
          env["SUPABASE_ANON_KEY"] ||
          "",
      ),
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
});
