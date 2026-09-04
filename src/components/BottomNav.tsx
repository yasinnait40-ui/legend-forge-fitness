import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Castle,
  ScrollText,
  Swords,
  Telescope,
  UserRound,
  WandSparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", labelKey: "nav.home", icon: Castle, exact: true },
  { to: "/quests", labelKey: "nav.quests", icon: ScrollText, exact: false },
  { to: "/trials", labelKey: "nav.trials", icon: Swords, exact: false },
  { to: "/progress", labelKey: "nav.legend", icon: Telescope, exact: false },
  { to: "/guide", labelKey: "nav.guide", icon: WandSparkles, exact: false },
  { to: "/character", labelKey: "nav.hero", icon: UserRound, exact: false },
  { to: "/settings", labelKey: "nav.settings", icon: Settings, exact: false },
] as const;

export function BottomNav() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[90]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Realm navigation"
    >
      <div className="border-t border-primary/30 bg-card/80 shadow-[0_-8px_30px_-12px_rgb(60_45_15/0.35)] backdrop-blur-xl">
        <div className="mx-auto flex h-[var(--nav-h)] max-w-lg items-stretch justify-between px-1">
          {ITEMS.map(({ to, labelKey, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className="relative flex flex-1 flex-col items-center justify-center gap-1"
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "absolute top-0 h-0.5 w-8 rounded-full transition-all duration-300",
                    active ? "bg-primary shadow-[0_0_12px_var(--primary)]" : "bg-transparent",
                  )}
                />
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-300",
                    active
                      ? "text-primary drop-shadow-[0_0_8px_var(--primary)]"
                      : "text-muted-foreground",
                  )}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span
                  className={cn(
                    "font-display text-[0.55rem] font-bold uppercase tracking-[0.14em] transition-colors duration-300",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {t(labelKey)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
