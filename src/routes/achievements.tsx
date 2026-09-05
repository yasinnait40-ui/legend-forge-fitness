import { createFileRoute } from "@tanstack/react-router";
import {
  Crown,
  Flame,
  Gem,
  Lock,
  Moon,
  Scroll,
  Shield,
  Sparkles,
  Sword,
  Swords,
  Zap,
} from "lucide-react";
import hallOfLegends from "@/assets/hall-of-legends.jpg";
import { RealmScreen } from "@/components/RealmScreen";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { useGame } from "@/lib/game-store";
import { ACHIEVEMENTS } from "@/lib/game-data";
import { useGameText } from "@/lib/game-i18n";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Hall of Legends — Achievements | AETHORA" },
      {
        name: "description",
        content:
          "A legendary hall of banners, weapons and glowing artifacts. Unlock achievements from Common to Legendary as your fitness legend grows.",
      },
      { property: "og:title", content: "Hall of Legends — Achievements | AETHORA" },
      {
        property: "og:description",
        content: "From First Quest to Legendary Discipline — claim every honor in the hall.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AchievementsPage,
});

const ACHIEVEMENT_ICONS = {
  scroll: Scroll,
  swords: Swords,
  sparkles: Sparkles,
  flame: Flame,
  moon: Moon,
  shield: Shield,
  sword: Sword,
  zap: Zap,
  crown: Crown,
  gem: Gem,
} as const;

function AchievementsPage() {
  const { t } = useTranslation();
  const g = useGameText();
  const game = useGame();
  const unlockedCount = ACHIEVEMENTS.filter((a) => game.achievements.includes(a.id)).length;

  return (
    <RealmScreen
      image={hallOfLegends}
      alt="A colossal hall of legends with banners, trophies and a glowing sword in stone"
      imagePosition="center 25%"
    >
      <header className="pt-10 text-center">
        <RuneHeading>{t("achievements.hallOfLegends", "Hall of Legends")}</RuneHeading>
        <h1 className="text-glow-gold font-display mt-3 text-3xl font-black tracking-[0.08em] text-primary">
          {t("achievements.title", "Honors & Relics")}
        </h1>
        <p className="mt-2 text-xs tracking-wide text-muted-foreground">
          {t("achievements.honorsClaimed", "{{count}} of {{total}} honors claimed", {
            count: unlockedCount,
            total: ACHIEVEMENTS.length,
          })}
        </p>
      </header>

      <div className="mt-6 space-y-3 rpg-stagger-in">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = game.achievements.includes(a.id);
          const Icon = ACHIEVEMENT_ICONS[a.icon as keyof typeof ACHIEVEMENT_ICONS];
          const color = `var(--rarity-${a.rarity})`;
          const at = g.achievement(a);
          return (
            <RunePanel
              key={a.id}
              className={cn(
                "flex items-center gap-4 achievement-unlocked",
                !unlocked && "opacity-55",
              )}
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2"
                style={
                  unlocked
                    ? {
                        borderColor: color,
                        background: `color-mix(in oklab, ${color} 14%, transparent)`,
                        boxShadow: `0 0 20px color-mix(in oklab, ${color} 55%, transparent)`,
                      }
                    : { borderColor: "color-mix(in oklab, var(--foreground) 14%, transparent)" }
                }
              >
                {unlocked ? (
                  <Icon className="h-6 w-6" style={{ color }} />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-sm font-bold tracking-[0.08em]">{at.name}</h3>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{at.flavor}</p>
                {unlocked && (
                  <span
                    className="rune-chip mt-1.5"
                    style={{
                      color,
                      borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
                      background: `color-mix(in oklab, ${color} 8%, transparent)`,
                    }}
                  >
                    {g.rarity(a.rarity)}
                  </span>
                )}
              </div>
            </RunePanel>
          );
        })}
      </div>

      <p className="mt-6 text-center text-[0.68rem] italic tracking-wide text-muted-foreground">
        {t("achievements.hallRemembers")}
      </p>
    </RealmScreen>
  );
}
