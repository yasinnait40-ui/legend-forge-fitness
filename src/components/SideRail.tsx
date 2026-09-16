/**
 * The floating side rail from the mockup: REWARDS → /shop, MAIL and DAILY
 * open their bottom sheets. Red-dot badges come from real server state:
 * an unclaimed welcome gift (ledger probe) and a ready daily tribute.
 */
import { Link } from "@tanstack/react-router";
import { CalendarDays, Gift, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRailBadges, type RailPanel } from "@/components/EconomyPanels";
import { cn } from "@/lib/utils";

const RAIL = [
  { key: "rewards", icon: Gift, labelKey: "rail.rewards" },
  { key: "mail", icon: Mail, labelKey: "rail.mail" },
  { key: "daily", icon: CalendarDays, labelKey: "rail.daily" },
] as const;

export function SideRail({
  signedIn,
  onPanel,
}: {
  signedIn: boolean;
  onPanel: (p: RailPanel) => void;
}) {
  const { t } = useTranslation();
  const badges = useRailBadges(signedIn);

  return (
    <div className="pointer-events-none fixed end-2 top-[40%] z-20 flex flex-col items-center gap-4">
      {RAIL.map(({ key, icon: Icon, labelKey }) => {
        const badge = badges[key as keyof typeof badges] ?? false;
        const openPanel = key !== "rewards";
        const inner = (
          <span className="pointer-events-auto relative flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-card/80 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.7)] backdrop-blur-md transition-all hover:border-primary/70 hover:bg-primary/15 active:scale-95">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            {badge && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgb(239_68_68/0.9)]" />
            )}
          </span>
        );
        return (
          <div key={key} className="flex flex-col items-center gap-1">
            {openPanel ? (
              <button
                type="button"
                onClick={() => onPanel(key as RailPanel)}
                aria-label={t(labelKey)}
              >
                {inner}
              </button>
            ) : (
              <Link to="/shop" aria-label={t(labelKey)}>
                {inner}
              </Link>
            )}
            <span
              className={cn(
                "font-display text-[0.52rem] font-bold uppercase tracking-[0.14em] text-foreground/90",
                "[text-shadow:0_1px_4px_rgb(0_0_0/0.9)]",
              )}
            >
              {t(labelKey)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
