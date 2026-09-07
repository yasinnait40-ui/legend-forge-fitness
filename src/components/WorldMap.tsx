import { Link } from "@tanstack/react-router";
import { Castle, MountainSnow, ScrollText, Swords, Telescope, Trees } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RuneHeading } from "@/components/RunePanel";
import { questsDoneToday, trialsDoneToday, useGame } from "@/lib/game-store";
import {
  QUESTS,
  TRIALS,
  levelFromXp,
  titleForLevel,
  WORLD_REGIONS,
  regionState,
  regionMasteryProgress,
  type WorldRegion,
} from "@/lib/game-data";
import type { CSSProperties } from "react";

/*
 * P1.3: the World Map gateway on the home screen.
 * Three starting regions remain the primary doorway, but the card also previews
 * how many further regions are waiting beyond the fog so the world feels alive
 * even before the player reaches the full map.
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

const ZONE_REGION_IDS = [
  "valerion",
  "silverpine-forest",
  "frosthold",
] as const;

export function WorldMap() {
  const { t } = useTranslation();
  const game = useGame();

  const questsSealed = QUESTS.filter((q) => questsDoneToday(game).includes(q.id)).length;
  const trialsConquered = TRIALS.filter((tr) => trialsDoneToday(game).includes(tr.id)).length;
  const level = levelFromXp(game.xp);

  const discoveredInZones = game.discoveredRegions.filter((id) =>
    ZONE_REGION_IDS.includes(id as (typeof ZONE_REGION_IDS)[number]),
  ).length;
  const unlockedBeyondZones = WORLD_REGIONS.filter(
    (region) =>
      !ZONE_REGION_IDS.includes(region.id as (typeof ZONE_REGION_IDS)[number]) &&
      regionState(region, game.xp, game.discoveredRegions, game.trialsEver) !== "locked",
  ).length;

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
                : titleForLevel(level);

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
                    <span
                      className="rune-chip text-[0.66rem]"
                      style={{ color: zone.color }}
                    >
                      {zone.to === "/trials" ? (
                        <Swords className="h-3 w-3" aria-hidden="true" />
                      ) : zone.to === "/quests" ? (
                        <ScrollText className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <Telescope className="h-3 w-3" aria-hidden="true" />
                      )}
                      {activity}
                    </span>
                    {unlockedBeyondZones > 0 && (
                      <span
                        className="rune-chip text-[0.6rem]"
                        style={{
                          color: "var(--muted-foreground)",
                          background: "color-mix(in oklab, var(--primary) 10%, transparent)",
                        }}
                      >
                        +{unlockedBeyondZones} {t("world.unknownRegions", "unexplored")}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="mt-3 text-[0.62rem] italic tracking-wide text-muted-foreground">
        {t(
          "world.mapNote",
          "The realm extends far beyond these borders. Travel grows with your legend.",
        )}
      </p>
    </section>
  );
}
