import { Link } from "@tanstack/react-router";
import { Castle, MountainSnow, ScrollText, Swords, Telescope, Trees } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RuneHeading } from "@/components/RunePanel";
import { questsDoneToday, trialsDoneToday, useGame } from "@/lib/game-store";
import { QUESTS, TRIALS } from "@/lib/game-data";
import type { CSSProperties } from "react";

/*
 * P1.2: the World Map — three starting regions. Each zone is a doorway into
 * one part of the daily loop, tinted with its own regional hue.
 */

interface WorldZone {
  to: string;
  nameKey: string;
  descKey: string;
  icon: typeof Castle;
  /** Regional accent color token. */
  color: string;
  /** Where the ambient glow sits inside the card. */
  glowX: string;
}

const ZONES: WorldZone[] = [
  {
    to: "/trials",
    nameKey: "world.kingdom.name",
    descKey: "world.kingdom.desc",
    icon: Castle,
    color: "var(--stat-strength)",
    glowX: "26%",
  },
  {
    to: "/quests",
    nameKey: "world.forest.name",
    descKey: "world.forest.desc",
    icon: Trees,
    color: "var(--stat-agility)",
    glowX: "72%",
  },
  {
    to: "/progress",
    nameKey: "world.frozen.name",
    descKey: "world.frozen.desc",
    icon: MountainSnow,
    color: "var(--stat-endurance)",
    glowX: "50%",
  },
];

export function WorldMap() {
  const { t } = useTranslation();
  const game = useGame();

  const questsSealed = QUESTS.filter((q) => questsDoneToday(game).includes(q.id)).length;
  const trialsConquered = TRIALS.filter((tr) => trialsDoneToday(game).includes(tr.id)).length;

  return (
    <section className="mt-4" aria-labelledby="world-map-heading">
      <RuneHeading>
        <span id="world-map-heading">{t("world.title", "The World Map")}</span>
      </RuneHeading>

      <div className="mt-3 grid gap-3">
        {ZONES.map((zone, index) => {
          const Icon = zone.icon;
          const zoneStyle = {
            "--zone-color": zone.color,
            "--zone-glow-x": zone.glowX,
            "--zone-delay": `${index * 0.12}s`,
          } as CSSProperties;

          const activity =
            zone.to === "/trials"
              ? `${trialsConquered}/${TRIALS.length}`
              : zone.to === "/quests"
                ? `${questsSealed}/${QUESTS.length}`
                : String(game.streak);

          return (
            <Link key={zone.to} to={zone.to} className="world-zone-enter block" style={zoneStyle}>
              <div className="world-zone px-4 py-3.5">
                <div className="world-zone-aura" aria-hidden="true" />
                <div className="relative flex items-center gap-3.5">
                  <span className="world-zone-icon shrink-0">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-display block text-sm font-bold uppercase tracking-[0.14em]">
                      {t(zone.nameKey)}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {t(zone.descKey)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rune-chip text-[0.66rem]" style={{ color: zone.color }}>
                      {zone.to === "/trials" ? (
                        <Swords className="h-3 w-3" aria-hidden="true" />
                      ) : zone.to === "/quests" ? (
                        <ScrollText className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <Telescope className="h-3 w-3" aria-hidden="true" />
                      )}
                      {activity}
                    </span>
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
