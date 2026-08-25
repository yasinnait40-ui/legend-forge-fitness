import { Link, useRouterState } from "@tanstack/react-router";
import { Castle, ScrollText, Swords, Telescope, UserRound, WandSparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", label: "Home", icon: Castle, exact: true },
  { to: "/quests", label: "Quests", icon: ScrollText, exact: false },
  { to: "/trials", label: "Trials", icon: Swords, exact: false },
  { to: "/progress", label: "Legend", icon: Telescope, exact: false },
  { to: "/guide", label: "Guide", icon: WandSparkles, exact: false },
  { to: "/character", label: "Hero", icon: UserRound, exact: false },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Realm navigation"
    >
      <div className="border-t border-primary/25 bg-background/85 shadow-[0_-10px_36px_rgb(0_0_0/0.6)] backdrop-blur-xl">
        <div className="mx-auto flex h-[var(--nav-h)] max-w-lg items-stretch justify-between px-1">
          {ITEMS.map(({ to, label, icon: Icon, exact }) => {
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
                    active
                      ? "bg-primary shadow-[0_0_12px_var(--primary)]"
                      : "bg-transparent",
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
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
