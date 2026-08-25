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
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav } from "../components/BottomNav";
import { hydrateGameStore } from "../lib/game-store";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-primary">404</h1>
        <h2 className="font-display mt-4 text-xl font-semibold text-foreground">Lost in the mist</h2>
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
      { title: "AETHORA — Forge Your Legend | Fantasy Fitness RPG" },
      {
        name: "description",
        content:
          "Enter AETHORA, a cinematic fantasy fitness RPG. Every workout becomes a quest, every goal earns XP, and the Arcane Guide — an ancient wizard — mentors your journey.",
      },
      { name: "author", content: "AETHORA" },
      { name: "theme-color", content: "#0d0b18" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "AETHORA" },
      { property: "og:title", content: "AETHORA — Forge Your Legend" },
      {
        property: "og:description",
        content:
          "A cinematic fantasy fitness RPG. Quests, trials, XP, levels, achievements — guided by an ancient wizard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "AETHORA — Forge Your Legend" },
      {
        name: "twitter:description",
        content: "A cinematic fantasy fitness RPG. Every workout becomes a quest.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800;900&family=Alegreya+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/icons/icon-512.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
    hydrateGameStore();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <BottomNav />
      <Toaster theme="dark" position="top-center" />
    </QueryClientProvider>
  );
}
