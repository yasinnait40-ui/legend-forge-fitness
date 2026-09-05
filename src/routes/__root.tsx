import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import i18n, { applyDirection } from "../lib/i18n";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav } from "../components/BottomNav";
import { ReminderMonitor } from "../components/ReminderMonitor";
import { hydrateGameStore, resetGameStore, ensureDailyRollover } from "../lib/game-store";
import { supabase } from "@/integrations/supabase/client";
import { startCloudSync, stopCloudSync } from "../lib/cloud-sync";
import "../lib/i18n";
import { hydrateSoundStore, initBackgroundMusic } from "../lib/sound-store";
import { hydrateBossStore } from "../lib/boss-store";

const CHARACTER_ASSETS = [
  "/characters/king.png",
  "/characters/adventurer.png",
  "/characters/scientist.png",
  "/characters/wizard.png",
  "/characters/sacred.png",
  "/characters/hakari.png",
  "/characters/sprite.png",
];

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-primary">404</h1>
        <h2 className="font-display mt-4 text-xl font-semibold text-foreground">
          Lost in the mist
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This path does not exist in the realm of Aethora — or it has long crumbled to ruin.
        </p>
        <div className="mt-6">
          <Link to="/" className="btn-gold mx-auto !w-auto px-6">
            Return to the Kingdom
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
          A dark force interrupted the realm
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Try again, or return to the kingdom.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="btn-gold !w-auto px-6"
          >
            Try again
          </button>
          <a href="/" className="btn-rune-ghost !w-auto px-6">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Aethora - Fantasy Fitness RPG & Workout Game" },
      {
        name: "description",
        content:
          "Turn your daily workouts, gym routines, and fitness journey into an epic fantasy RPG adventure. Level up your character stats, complete daily quests, and forge your legend with Aethora.",
      },
      {
        name: "keywords",
        content:
          "fitness rpg, workout game, gamified fitness, gym rpg, aethora, arcane warrior, fitness quest, level up fitness",
      },
      { name: "author", content: "Hakari" },
      { name: "theme-color", content: "#faf3e3" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "AETHORA" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Aethora - Fantasy Fitness RPG & Workout Game" },
      {
        property: "og:description",
        content:
          "Turn your daily workouts into a fantasy RPG adventure. Level up your stats and complete quests.",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Aethora - Fantasy Fitness RPG & Workout Game" },
      {
        name: "twitter:description",
        content: "Turn your daily workouts into a fantasy RPG adventure.",
      },
    ],
    links: [
      ...CHARACTER_ASSETS.map((href) => ({ rel: "preload", as: "image", href })),
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800;900&family=Alegreya+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("aethora_lang");
    const browserLanguage = window.navigator.language?.split("-")[0];
    const language = savedLanguage || browserLanguage;
    if (language && ["en", "ar", "ja", "es", "fr"].includes(language)) {
      applyDirection(language);
      if (language !== i18n.language) void i18n.changeLanguage(language);
    }

    hydrateSoundStore();
    hydrateBossStore();
    initBackgroundMusic();

    // P0.2: keep daily quest/trial seals aligned with the local calendar
    // across midnight ticks, tab focus, and visibility changes.
    ensureDailyRollover();

    // Supabase is optional for the public preview. Keep the local game experience
    // available when the project has not supplied its cloud credentials yet.
    const viteEnv = import.meta.env as ImportMetaEnv & {
      VITE_SUPABASE_URL?: string;
      VITE_SUPABASE_PUBLISHABLE_KEY?: string;
    };
    const supabaseUrl = viteEnv.VITE_SUPABASE_URL || process.env["SUPABASE_URL"];
    const supabaseKey =
      viteEnv.VITE_SUPABASE_PUBLISHABLE_KEY || process.env["SUPABASE_PUBLISHABLE_KEY"];

    if (!supabaseUrl || !supabaseKey) {
      stopCloudSync();
      return;
    }

    let activeUserId: string | null = null;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user?.id ?? null;
      if (nextUserId && nextUserId !== activeUserId) {
        activeUserId = nextUserId;
        resetGameStore();
        startCloudSync(nextUserId);
      } else if (!nextUserId) {
        activeUserId = null;
        stopCloudSync();
        resetGameStore();
      }
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session?.user) {
        if (error) console.error("[v0] session restoration failed", error.message);
        resetGameStore();
        stopCloudSync();
        return;
      }
      activeUserId = data.session.user.id;
      resetGameStore();
      startCloudSync(activeU