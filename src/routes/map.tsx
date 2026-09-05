import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGame } from "@/lib/game-store";
import { levelFromXp } from "@/lib/game-data";
import { RuneHeading } from "@/components/RunePanel";
import { WORLD_REGIONS, isRegionUnlocked, type WorldRegion } from "@/lib/world-map-data";
import worldMapImg from "@/assets/world-map.png";

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

function MapPage() {
  const { t } = useTranslation();
  const game = useGame();
  const level = levelFromXp(game.xp);
  const [selected, setSelected] = useState<WorldRegion | null>(null);

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

      <div
        className="relative mx-auto mt-6 aspect-[2/3] w-full max-w-md overflow-hidden rounded-2xl border-2 shadow-[0_-8px_30px_-12px_rgb(0_0_0/0.5)]"
        style={{ borderColor: "color-mix(in oklab, var(--primary) 55%, transparent)" }}
      >
        {/* Ambient glow behind the map */}
        <div className="absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(ellipse_at_30%_20%,_color-mix(in_oklab,_var(--primary)_20%,_transparent)_0%,_transparent_60%)] pointer-events-none" />
        {/* Base illustrated map */}
        <img
          src={worldMapImg}
          alt="Map of the realm of Aethora"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />

        {/* Darken overall for legibility of markers */}
        <div className="pointer-events-none absolute inset-0 bg-black/8" />

        {WORLD_REGIONS.map((region) => {
          const unlocked = isRegionUnlocked(region, game.xp);
          return (
            <div
              key={region.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${region.x}%`, top: `${region.y}%` }}
            >
              {!unlocked && (
                // Fog patch: blurs + darkens the map art under locked regions,
                // feathered at the edges so it doesn't look like a hard circle.
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 backdrop-blur-md"
                  style={{
                    background: "rgba(20, 18, 12, 0.55)",
                    WebkitMaskImage: "radial-gradient(circle, black 45%, transparent 75%)",
                    maskImage: "radial-gradient(circle, black 45%, transparent 75%)",
                  }}
                />
              )}

              <button
                type="button"
                onClick={() => unlocked && setSelected(region)}
                disabled={!unlocked}
                className="relative flex flex-col items-center gap-1"
                aria-label={region.name}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300"
                  style={{
                    borderColor: unlocked ? "var(--primary)" : "rgba(255,255,255,0.55)",
                    background: unlocked
                      ? "color-mix(in oklab, var(--primary) 30%, rgba(20,15,5,0.55))"
                      : "rgba(10,10,10,0.5)",
                    boxShadow: unlocked
                      ? "0 0 14px color-mix(in oklab, var(--primary) 65%, transparent)"
                      : "none",
                  }}
                >
                  {unlocked ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  ) : (
                    <Lock className="h-4 w-4 text-white/80" strokeWidth={2.4} />
                  )}
                </span>
                <span
                  className="whitespace-nowrap rounded-full px-2 py-0.5 font-display text-[0.5rem] font-bold uppercase tracking-[0.08em] shadow-sm"
                  style={{
                    color: unlocked ? "#2a1c08" : "rgba(255,255,255,0.85)",
                    background: unlocked
                      ? "color-mix(in oklab, var(--primary) 88%, transparent)"
                      : "rgba(0,0,0,0.55)",
                  }}
                >
                  {unlocked ? region.name : `Lv.${region.levelReq}`}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {selected && (
        <div
          className="mx-auto mt-6 max-w-md rounded-xl border p-4 backdrop-blur-xl"
          style={{
            borderColor: "color-mix(in oklab, var(--primary) 35%, transparent)",
            background: "color-mix(in oklab, var(--card) 85%, transparent)",
          }}
        >
          <RuneHeading>{t("map.region", "Region")}</RuneHeading>
          <h2 className="font-display mt-2 text-xl font-black text-primary">{selected.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{selected.description}</p>
          <Link to="/quests" className="btn-gold mt-4 inline-block !w-auto px-6">
            {t("map.beginQuest", "Begin Quest")}
          </Link>
        </div>
      )}

      {!selected && (
        <p className="mx-auto mt-6 max-w-md text-center text-sm italic text-muted-foreground">
          {level < 27
            ? t("map.hint", "Grow your legend to lift the fog from new regions.")
            : t("map.hintAll", "Tap a region to view its trials.")}
        </p>
      )}
    </div>
  );
}
