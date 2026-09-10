import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Compass, Crown, Lock, ScrollText, Sparkles, Swords } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { discoverRegion, useGame } from "@/lib/game-store";
import { levelFromXp, QUESTS, TRIALS } from "@/lib/game-data";
import { FantasyCharacter } from "@/components/FantasyCharacter";
import { RuneHeading } from "@/components/RunePanel";
import {
  regionMasteryProgress,
  regionState,
  WORLD_REGIONS,
  type WorldRegion,
} from "@/lib/world-map-data";
import worldMapImg from "@/assets/world-map.webp";

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

const DIFFICULTY_LABELS = ["", "Common", "Uncommon", "Rare", "Epic", "Legendary"] as const;

/** Per-difficulty accent hue so each region tier reads with a distinct color on the map. */
const ZONE_COLOR: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "oklch(0.62 0.15 78)", // gold
  2: "oklch(0.58 0.16 232)", // blue
  3: "oklch(0.6 0.17 150)", // emerald
  4: "oklch(0.55 0.17 300)", // violet
  5: "oklch(0.62 0.15 18)", // deep red
};

/** Narrating character per region — introduces the land in its own voice. */
const NARRATOR_LINES = {
  king: "world.regionNarrator.king",
  adventurer: "world.regionNarrator.adventurer",
  scholar: "world.regionNarrator.scholar",
  sage: "world.regionNarrator.sage",
} as const;

function MapPage() {
  const { t } = useTranslation();
  const game = useGame();
  const level = levelFromXp(game.xp);
  const [selected, setSelected] = useState<WorldRegion | null>(null);

  // Discovery moment: whenever an unlocked-but-unvisited region exists, show
  // the discovery banner once. The banner itself is transient; the region
  // becomes "discovered" the moment the player enters it (or after the
  // banner is dismissed so returning players don't see it forever).
  const pending = useMemo(
    () =>
      WORLD_REGIONS.find(
        (r) => regionState(r, game.xp, game.discoveredRegions, game.trialsEver) === "available",
      ) ?? null,
    [game.xp, game.discoveredRegions, game.trialsEver],
  );

  useEffect(() => {
    if (pending) {
      toast(t("map.discoveredToast", "New region discovered"), {
        description: pending.name,
      });
    }
  }, [pending, t]);

  const handleEnter = (region: WorldRegion) => {
    discoverRegion(region.id);
    setSelected(region);
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-10">
      <header className="text-center">
        <p className="font-display text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">
          {t("map.subtitle", "The Realm Of")}
        </p>
        <h1 className="text-glow-gold font-display mt-1 text-3xl font-black tracking-[0.08em] text-primary">
          {t("map.title", "World Map")}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("map.progress", "{{discovered}} of {{total}} regions discovered", {
            discovered: game.discoveredRegions.length,
            total: WORLD_REGIONS.length,
          })}
        </p>
      </header>

      {pending && (
        <div
          className="rune-panel mx-auto mt-4 max-w-md p-4 text-center"
          role="status"
          aria-live="polite"
        >
          <p className="font-display flex items-center justify-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.3em] text-accent">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            {t("map.discovered", "New Region Discovered")}
          </p>
          <h2 className="font-display mt-1 text-xl font-black text-primary">{pending.name}</h2>
          <p className="mt-1.5 text-xs italic leading-snug text-muted-foreground">
            {t("map.discoveredLore", "The road is open. A new chapter of your legend begins.")}
          </p>
          <button
            type="button"
            onClick={() => handleEnter(pending)}
            className="btn-gold mt-3 !w-auto px-8"
          >
            {t("map.enterRegion", "Enter")}
          </button>
        </div>
      )}

      <div
        className="relative mx-auto mt-6 aspect-[2/3] w-full max-w-md overflow-hidden rounded-2xl border-2 shadow-[0_-8px_30px_-12px_rgb(0_0_0/0.5)]"
        style={{ borderColor: "color-mix(in oklab, var(--primary) 55%, transparent)" }}
      >
        {/* Ambient glow behind the map */}
        <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(ellipse_at_30%_20%,_color-mix(in_oklab,_var(--primary)_20%,_transparent)_0%,_transparent_60%)]" />
        {/* Base illustrated map */}
        <img
          src={worldMapImg}
          alt="Map of the realm of Aethora"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />

        {/* Subtle vignette for depth */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,_transparent_40%,_rgba(10,8,3,0.35)_95%)]" />

        {/* Darken overall for legibility of markers */}
        <div className="pointer-events-none absolute inset-0 bg-black/9" />

        {WORLD_REGIONS.map((region) => {
          const state = regionState(region, game.xp, game.discoveredRegions, game.trialsEver);
          const interactable = state !== "locked";
          return (
            <div
              key={region.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${region.x}%`, top: `${region.y}%` }}
            >
              {state === "locked" && (
                // Fog patch: blurs + darkens the map art under locked regions,
                // feathered at the edges so it doesn't look like a hard circle.
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 backdrop-blur-md"
                  style={{
                    background: "rgba(18,15,8,0.62)",
                    WebkitMaskImage: "radial-gradient(circle, black 38%, transparent 72%)",
                    maskImage: "radial-gradient(circle, black 38%, transparent 72%)",
                  }}
                />
              )}{" "}
              <button
                type="button"
                onClick={() => interactable && setSelected(region)}
                disabled={!interactable}
                className="relative flex flex-col items-center gap-1"
                aria-label={region.name}
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300"
                  style={{
                    "--zone-color": ZONE_COLOR[region.difficulty],
                    borderColor:
                      state === "locked"
                        ? "rgba(255,255,255,0.55)"
                        : state === "mastered"
                          ? "var(--rarity-legendary)"
                          : "var(--zone-color)",
                    background:
                      state === "locked"
                        ? "rgba(10,10,10,0.5)"
                        : "color-mix(in oklab, var(--zone-color) 32%, rgba(20,15,5,0.55))",
                    boxShadow:
                      state === "locked"
                        ? "none"
                        : state === "mastered"
                          ? "0 0 16px color-mix(in oklab, var(--rarity-legendary) 75%, transparent)"
                          : "0 0 14px color-mix(in oklab, var(--zone-color) 65%, transparent)",
                  }}
                >
                  {state === "locked" ? (
                    <Lock className="h-4 w-4 text-white/80" strokeWidth={2.4} />
                  ) : state === "available" ? (
                    <Sparkles
                      className="h-4 w-4"
                      style={{ color: "var(--zone-color)" }}
                      aria-hidden="true"
                    />
                  ) : state === "mastered" ? (
                    <CheckCircle2
                      className="h-4 w-4"
                      style={{ color: "var(--rarity-legendary)" }}
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: "var(--zone-color)" }}
                    />
                  )}
                </span>
                <span
                  className="whitespace-nowrap rounded-full px-2 py-0.5 font-display text-[0.5rem] font-bold uppercase tracking-[0.08em] shadow-sm"
                  style={{
                    color: state === "locked" ? "rgba(255,255,255,0.85)" : "#2a1c08",
                    background:
                      state === "locked"
                        ? "rgba(0,0,0,0.55)"
                        : state === "available"
                          ? "color-mix(in oklab, var(--zone-color) 88%, transparent)"
                          : "color-mix(in oklab, var(--zone-color) 88%, transparent)",
                  }}
                >
                  {state === "locked"
                    ? `Lv.${region.levelReq}`
                    : state === "available"
                      ? t("map.new", "NEW")
                      : state === "mastered"
                        ? t("map.mastered", "Mastered")
                        : region.name}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {selected && <RegionPanel region={selected} onEnter={() => handleEnter(selected)} />}

      {!selected && !pending && (
        <p className="mx-auto mt-6 max-w-md text-center text-sm italic text-muted-foreground">
          {level < 27
            ? t("map.hint", "Grow your legend to lift the fog from new regions.")
            : t("map.hintAll", "Tap a region to view its trials.")}
        </p>
      )}
    </div>
  );
}

/** Region detail: lore, difficulty, recommended level, linked activities, mastery. */
function RegionPanel({ region, onEnter }: { region: WorldRegion; onEnter: () => void }) {
  const { t } = useTranslation();
  const game = useGame();

  const quests = QUESTS.filter((q) => region.questIds.includes(q.id));
  const trials = TRIALS.filter((tr) => region.trialIds.includes(tr.id));
  const mastery = regionMasteryProgress(region, game.trialsEver);
  const narratorKey = NARRATOR_LINES[region.narrator];

  return (
    <div
      className="rune-panel mx-auto mt-6 max-w-md p-4"
      role="region"
      aria-label={region.name}
      style={{ "--zone-color": ZONE_COLOR[region.difficulty] }}
    >
      <RuneHeading>{t("map.region", "Region")}</RuneHeading>{" "}
      <h2
        className="font-display mt-2 flex items-center gap-2 text-xl font-black"
        style={{ color: "var(--zone-color)" }}
      >
        {region.narrator === "king" && <Crown className="h-5 w-5" aria-hidden="true" />}
        {region.name}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{region.description}</p>
      <p
        className="mt-2 border-l-2 pl-3 text-xs italic leading-snug text-foreground/80"
        style={{ borderColor: "color-mix(in oklab, var(--zone-color) 45%, transparent)" }}
      >
        {region.lore}
      </p>
      {/* The region's narrator introduces the land in character. */}
      <FantasyCharacter kind={region.narrator} dialogue={t(narratorKey)} embedded />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className="rune-chip"
          style={{
            color: "var(--zone-color)",
            borderColor: "color-mix(in oklab, var(--zone-color) 40%, transparent)",
          }}
        >
          <Swords className="h-3 w-3" aria-hidden="true" />
          {t("map.difficulty", "Difficulty")}:{" "}
          {t(`map.difficultyName.${region.difficulty}`, DIFFICULTY_LABELS[region.difficulty])}
        </span>
        <span className="rune-chip">
          <Crown className="h-3 w-3" aria-hidden="true" />
          {t("map.recommended", "Recommended Lv.")} {region.levelReq}+
        </span>
      </div>
      {quests.length > 0 && (
        <div className="mt-3">
          <p className="font-display text-[0.62rem] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            {t("map.linkedQuests", "Quests of this land")}
          </p>
          <ul className="mt-1 space-y-1">
            {quests.map((q) => (
              <li key={q.id} className="flex items-center gap-1.5 text-xs">
                <ScrollText className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                {t(`game.quests.${q.id}.name`, q.name)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {trials.length > 0 && (
        <div className="mt-3">
          <p className="font-display text-[0.62rem] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            {t("map.linkedTrials", "Trials of this land")}
          </p>
          <ul className="mt-1 space-y-1">
            {trials.map((tr) => {
              const done = game.trialsEver.includes(tr.id);
              return (
                <li key={tr.id} className="flex items-center gap-1.5 text-xs">
                  <Swords
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: done ? "var(--rarity-legendary)" : "var(--stat-strength)" }}
                    aria-hidden="true"
                  />
                  <span className={done ? "font-semibold" : ""}>
                    {t(`game.trials.${tr.id}.name`, tr.name)}
                  </span>
                  {done && (
                    <CheckCircle2
                      className="h-3 w-3 shrink-0"
                      style={{ color: "var(--rarity-legendary)" }}
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {trials.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[0.66rem] font-semibold text-muted-foreground">
            <span>{t("map.mastery", "Mastery")}</span>
            <span>{Math.round(mastery * 100)}%</span>
          </div>
          <div className="bar-track mt-1">
            <div
              className="bar-fill"
              style={{
                width: `${mastery * 100}%`,
                background: "linear-gradient(90deg, var(--primary), var(--rarity-legendary))",
              }}
            />
          </div>
          {mastery >= 1 && (
            <p
              className="mt-1.5 text-[0.68rem] font-semibold"
              style={{ color: "var(--rarity-legendary)" }}
            >
              {t("map.masteredNote", "This land remembers your legend.")}
            </p>
          )}
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onEnter} className="btn-gold !w-auto">
          {t("map.explore", "Explore")}
        </button>
        <Link to="/quests" className="btn-rune-ghost !w-auto">
          {t("map.beginQuest", "Begin Quest")}
        </Link>
      </div>
    </div>
  );
}
