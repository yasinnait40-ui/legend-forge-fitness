import { useState, useRef, useEffect, useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Compass,
  Crown,
  Lock,
  ScrollText,
  Sparkles,
  Swords,
  MapPin,
  Eye,
  Shield,
  Building2,
  Anchor,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { RuneHeading } from "@/components/RunePanel";
import { discoverRegion, questsDoneToday, trialsDoneToday, useGame } from "@/lib/game-store";
import { QUESTS, TRIALS, levelFromXp } from "@/lib/game-data";
import {
  WORLD_REGIONS,
  regionState,
  type RegionState,
  type WorldRegion,
} from "@/lib/world-map-data";
import type { CSSProperties } from "react";
import worldMapImage from "@/assets/world-map.png";

/*
 * P1.4: the World Map — illustrated map with absolutely positioned region markers.
 * The fantasy map artwork is the background; every WORLD_REGION becomes a hotspot
 * placed with percentage-based x/y so it scales cleanly on any screen.
 */

/** Map marker symbol for each settlement/region class, matching the map legend. */
export type MapLegendKind =
  | "capital"
  | "major"
  | "town"
  | "village"
  | "dungeon"
  | "ruins"
  | "road"
  | "path"
  | "bridge"
  | "port";

const LEGEND_KIND: Record<WorldRegion["difficulty"], MapLegendKind> = {
  1: "capital",
  2: "major",
  3: "town",
  4: "village",
  5: "dungeon",
};

const LEGEND: Array<readonly [MapLegendKind, string]> = [
  ["capital", "Capital"],
  ["major", "Major City"],
  ["town", "Town"],
  ["village", "Village"],
  ["dungeon", "Dungeon"],
  ["ruins", "Ruins"],
  ["road", "Road"],
  ["path", "Path"],
  ["bridge", "Bridge"],
  ["port", "Port"],
];

const LEGEND_MARKER: Record<MapLegendKind, typeof Crown> = {
  capital: Crown,
  major: Eye,
  town: MapPin,
  village: Sparkles,
  dungeon: Shield,
  ruins: Building2,
  road: ScrollText,
  path: Swords,
  bridge: CheckCircle2,
  port: Anchor,
};

/** Small symbol inside each region marker, chosen from the legend set by difficulty tier. */
function regionMarkerIcon(region: WorldRegion, state: RegionState) {
  const Icon = LEGEND_MARKER[LEGEND_KIND[region.difficulty]];
  return (
    <Icon
      className="h-3.5 w-3.5"
      strokeWidth={2.2}
      style={
        state === "available"
          ? { color: "var(--rarity-legendary)" }
          : undefined
      }
      aria-hidden="true"
    />
  );
}

const ZONE_REGION_IDS = [
  "valerion",
  "silverpine-forest",
  "frosthold",
] as const;

const MAP_KEEP_ASPECT = "4 / 5";

/**
 * Interactive illustrated-map card with:
 * - the world-map artwork as the background
 * - percentage-based region hotspots over it
 * - a collapsible bottom-left legend mirroring the reference sheet
 * - a transient "NEW" pulse on newly unlocked regions
 */
export function WorldMap() {
  const { t } = useTranslation();
  const game = useGame();
  const focusedRef = useRef<WorldRegion | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [pulsingId, setPulsingId] = useState<string | null>(null);

  const zoneWidth = 16;

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

  useEffect(() => {
    const available = WORLD_REGIONS.find(
      (r) => regionState(r, game.xp, game.discoveredRegions, game.trialsEver) === "available",
    );
    if (!available) return;
    setPulsingId(available.id);
    const timer = setTimeout(() => setPulsingId(null), 1400);
    return () => clearTimeout(timer);
  }, [game.xp, game.discoveredRegions, game.trialsEver]);

  const enterRegion = useCallback(
    (region: WorldRegion) => {
      discoverRegion(region.id);
      focusedRef.current = region;
    },
    [],
  );

  const focusedRegion = focusedRef.current ?? null;

  const regionStyle = useCallback(
    (region: WorldRegion): CSSProperties => ({
      left: `${region.x}%`,
      top: `${region.y}%`,
    }),
    [],
  );

  return (
    <section className="mt-4" aria-labelledby="world-map-heading">
      <RuneHeading>
        <span id="world-map-heading">{t("world.title", "The World Map")}</span>
      </RuneHeading>

      <div className="mt-3 grid gap-3">
        <div className="rounded-xl border-2 border-primary/35 bg-card/70 p-2" style={{ aspectRatio: MAP_KEEP_ASPECT }}>
          <InteractiveMap
            zoneWidth={zoneWidth}
            xp={game.xp}
            discoveredRegions={game.discoveredRegions}
            trialsEver={game.trialsEver}
            enterRegion={enterRegion}
            focusRegion={focusedRegion}
            onFocusChange={() => {
              // plate the focused map region into the route-level panel when present.
            }}
            pulsingId={pulsingId}
            regionStyle={regionStyle}
            showLegend
            legendOpen={legendOpen}
            onToggleLegend={() => setLegendOpen((prev) => !prev)}
          />
        </div>
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

interface InteractiveMapProps {
  zoneWidth: number;
  xp: number;
  discoveredRegions: string[];
  trialsEver: string[];
  enterRegion: (region: WorldRegion) => void;
  focusRegion: WorldRegion | null;
  onFocusChange: () => void;
  pulsingId: string | null;
  regionStyle: (region: WorldRegion) => CSSProperties;
  showLegend: boolean;
  legendOpen: boolean;
  onToggleLegend: () => void;
}

function InteractiveMap({
  zoneWidth,
  xp,
  discoveredRegions,
  trialsEver,
  enterRegion,
  focusRegion,
  pulsingId,
  regionStyle,
  showLegend,
  legendOpen,
  onToggleLegend,
}: InteractiveMapProps) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative overflow-hidden" style={{ aspectRatio: MAP_KEEP_ASPECT }}>
      <div
        ref={mapRef}
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${worldMapImage})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 rounded-lg"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, color-mix(in oklab, var(--primary) 22%, transparent) 0%, transparent 62%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 rounded-lg"
        style={{
          background:
            "radial-gradient(ellipse at 75% 65%, color-mix(in oklab, var(--secondary) 24%, transparent) 0%, transparent 58%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-0 rounded-lg bg-black/40" />

      {/* Floating world map title + legend toggle badge, per reference sheet */}
      <div className="pointer-events-none absolute top-0 left-0 z-20 flex max-w-full flex-col gap-1.5 overflow-hidden p-3">
        <div className="flex items-center gap-2 rounded-sm bg-black/35 px-3 py-1 text-center text-[0.52rem] font-bold uppercase tracking-[0.18em] text-card-foreground shadow-sm backdrop-blur-sm">
          <Compass className="h-3 w-3 text-primary" aria-hidden="true" />
          <span>{t("map.region", "Region")}</span>
        </div>
        <button
          type="button"
          onClick={onToggleLegend}
          className="pointer-events-auto flex h-8 w-20 cursor-pointer items-center justify-between rounded border border-primary/40 bg-black/30 px-3 text-left text-[0.5rem] font-bold uppercase tracking-[0.16em] text-card-foreground shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-primary/70"
          aria-expanded={legendOpen}
          aria-controls="world-map-legend"
        >
          <span>{t("map.legend", "Legend")}</span>
          <span className="text-primary">{legendOpen ? "−" : "+"}</span>
        </button>
      </div>

      {/* Collapsible legend panel, bottom-left */}
      {showLegend && (
        <div
          id="world-map-legend"
          className={`pointer-events-auto absolute bottom-3 left-3 z-20 rounded-lg border border-primary/40 bg-black/45 p-2 backdrop-blur-sm transition-all duration-250 ${
            legendOpen ? "block opacity-100" : "hidden opacity-0"
          }`}
          role="region"
          aria-label={t("map.legend", "Map legend")}
        >
          <p className="mb-1.5 text-[0.5rem] font-bold uppercase tracking-[0.18em] text-primary">
            {t("map.legend", "Legend")}
          </p>
          <ul className="grid grid-cols-2 gap-x-2 gap-y-1 text-[0.55rem] text-card-foreground">
            {LEGEND.map(([kind, label]) => {
              const Icon = LEGEND_MARKER[kind];
              return (
                <li key={kind} className="flex items-center gap-2">
                  <span
                    className="select-none"
                    style={{
                      width: 9,
                      height: 9,
                      color: "var(--foreground)",
                    }}
                  >
                    <Icon className="h-full w-full" aria-hidden="true" />
                  </span>
                  <span className="text-[0.5rem] uppercase tracking-wider">{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Region markers */}
      {WORLD_REGIONS.map((region) => {
        const state = regionState(region, xp, discoveredRegions, trialsEver);
        const isLocked = state === "locked";
        const isFocused = focusRegion?.id === region.id;
        const isBrandNew = pulsingId === region.id;
        const isActive = isFocused || isBrandNew;

        return (
          <div
            key={region.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={regionStyle(region)}
          >
            {isLocked ? (
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full backdrop-blur-md"
                style={{
                  background: "rgba(15,12,6,0.7)",
                  WebkitMaskImage: "radial-gradient(circle, black 32%, transparent 72%)",
                  maskImage: "radial-gradient(circle, black 32%, transparent 72%)",
                }}
                aria-hidden="true"
              />
            ) : null}

            <button
              type="button"
              onClick={() => !isLocked && enterRegion(region)}
              disabled={isLocked}
              className="group relative flex flex-col items-center"
              aria-label={region.name}
              style={{
                outline: "none",
                " --pulse-opacity": isBrandNew ? "1" : "0",
              } as CSSProperties}
            >
              <span
                className="pointer-events-none absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/60 bg-black/40 opacity-0 transition-all duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
                aria-hidden="true"
                style={{
                  boxShadow: isActive
                    ? "0 0 0 4px rgba(212,175,55,0.0), 0 0 18px color-mix(in oklab, var(--primary) 65%, transparent)"
                    : "0 0 0 0px rgba(255,255,255,0)",
                  opacity: isActive ? 1 : 0.6,
                }}
              />

              <span
                className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full border-2 bg-black/45 transition-all duration-250"
                style={{
                  width: zoneWidth,
                  height: zoneWidth,
                  borderColor:
                    isLocked
                      ? "rgba(255,255,255,0.55)"
                      : isActive
                        ? "var(--rarity-legendary)"
                        : "color-mix(in oklab, var(--zone-color, var(--primary)) 55%, transparent)",
                  background:
                    isLocked
                      ? "rgba(18,14,8,0.6)"
                      : isActive
                        ? "color-mix(in oklab, var(--rarity-legendary) 35%, rgba(20,15,5,0.55))"
                        : "color-mix(in oklab, var(--zone-color, var(--primary)) 28%, rgba(20,15,5,0.5))",
                  boxShadow: isLocked
                    ? "none"
                    : isActive
                      ? "0 0 14px color-mix(in oklab, var(--rarity-legendary) 80%, transparent)"
                      : "0 0 10px color-mix(in oklab, var(--zone-color, var(--primary)) 55%, transparent)",
                  animation: isBrandNew
                    ? "map-pulse 1.2s ease-out infinite"
                    : undefined,
                }}
              >
                <span
                  className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full transition-opacity duration-200"
                  style={{
                    opacity: state === "locked" ? 0.9 : 1,
                  }}
                >
                  {state === "locked" ? (
                    <Lock
                      className="h-3.5 w-3.5"
                      strokeWidth={2.4}
                      style={{ color: "rgba(255,255,255,0.85)" }}
                      aria-hidden="true"
                    />
                  ) : (
                    regionMarkerIcon(region, state)
                  )}
                </span>
              </span>

              <span
                className="pointer-events-none absolute left-1/2 top-full mt-1.5 flex -translate-x-1/2 items-center whitespace-nowrap rounded-full bg-black/55 px-2 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.08em] shadow-sm transition-all duration-200 group-hover:bg-black/70"
                style={{
                  color: isLocked ? "rgba(255,255,255,0.85)" : "#f3e7c9",
                }}
              >
                {isLocked ? `Lv.${region.levelReq}` : state === "available" ? t("map.new", "NEW") : state === "mastered" && t("map.mastered", "Mastered")}
              </span>
            </button>
          </div>
        );
      })}

      {/* Accessibility-only map description */}
      <span className="sr-only">
        {t("world.mapNote", "The realm extends far beyond these borders. Travel grows with your legend.")}
      </span>

      <style>{`
        @keyframes map-pulse {
          0% {
            box-shadow: 0 0 0 0px color-mix(in oklab, var(--rarity-legendary) 80%, transparent);
            transform: translate(-50%, -50%) scale(1);
          }
          55% {
            transform: translate(-50%, -50%) scale(1.18);
          }
          100% {
            box-shadow: 0 0 0 18px color-mix(in oklab, var(--rarity-legendary) 0%, transparent);
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
