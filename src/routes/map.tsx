import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Castle, TreePine, Sun, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGame } from "@/lib/game-store";
import { levelFromXp } from "@/lib/game-data";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { WORLD_REGIONS, isRegionUnlocked, type WorldRegion } from "@/lib/world-map-data";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "World Map — AETHORA" },
      {
        name: "description",
        content: "Explore the realm of Aethora. Unlock new regions as your legend grows.",
      },
    ],
  }),
  component: MapPage,
});

const REGION_ICON = {
  castle: Castle,
  forest: TreePine,
  desert: Sun,
} as const;

function MapPage() {
  const { t } = useTranslation();
  const game = useGame();
  const level = levelFromXp(game.xp);
  const [selected, setSelected] = useState<WorldRegion | null>(null);

  const pathD = `M ${WORLD_REGIONS.map((r) => `${r.x} ${r.y}`).join(" L ")}`;

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-10">
      <header className="text-center">
        <p className="font-display text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">
          {t("map.subtitle", "The Realm Of")}
        </p>
        <h1 className="text-glow-gold font-display mt-1 text-3xl font-black tracking-[0.08em] text-primary">
          {t("map.title", "World Map")}
        </h1>
      </header>

      <RunePanel className="relative mx-auto mt-8 aspect-[3/2] w-full max-w-md overflow-hidden !p-0">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <path
            d={pathD}
            fill="none"
            stroke="color-mix(in oklab, var(--primary) 45%, transparent)"
            strokeWidth="0.6"
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {WORLD_REGIONS.map((region) => {
          const unlocked = isRegionUnlocked(region, game.xp);
          const Icon = REGION_ICON[region.icon];
          return (
            <button
              key={region.id}
              type="button"
              onClick={() => unlocked && setSelected(region)}
              disabled={!unlocked}
              className="absolute flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${region.x}%`, top: `${region.y}%` }}
              aria-label={region.name}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-300"
                style={{
                  borderColor: unlocked ? "var(--primary)" : "var(--muted-foreground)",
                  background: unlocked
                    ? "color-mix(in oklab, var(--primary) 22%, var(--card))"
                    : "color-mix(in oklab, var(--muted-foreground) 12%, var(--card))",
                  boxShadow: unlocked
                    ? "0 0 14px color-mix(in oklab, var(--primary) 55%, transparent)"
                    : "none",
                }}
              >
                {unlocked ? (
                  <Icon className="h-5 w-5 text-primary" strokeWidth={2} />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
                )}
              </span>
              <span
                className={
                  unlocked
                    ? "font-display text-[0.55rem] font-bold uppercase tracking-[0.1em] text-primary"
                    : "font-display text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground"
                }
              >
                {unlocked ? region.name : `Lv.${region.levelReq}`}
              </span>
            </button>
          );
        })}
      </RunePanel>

      {selected && (
        <RunePanel className="mx-auto mt-6 max-w-md">
          <RuneHeading>{t("map.region", "Region")}</RuneHeading>
          <h2 className="font-display mt-2 text-xl font-black text-primary">{selected.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{selected.description}</p>
          <Link to="/quests" className="btn-gold mt-4 inline-block !w-auto px-6">
            {t("map.beginQuest", "Begin Quest")}
          </Link>
        </RunePanel>
      )}

      {!selected && (
        <p className="mx-auto mt-6 max-w-md text-center text-sm italic text-muted-foreground">
          {level < 8
            ? t("map.hint", "Grow your legend to unlock new regions of Aethora.")
            : t("map.hintAll", "Tap a region to view its trials.")}
        </p>
      )}
    </div>
  );
}