import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Castle, TreePine, Sun, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGame } from "@/lib/game-store";
import { levelFromXp } from "@/lib/game-data";
import { RuneHeading } from "@/components/RunePanel";
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

// Curved road connecting the regions, in order.
function buildRoadPath(regions: WorldRegion[]): string {
  if (regions.length < 2) return "";
  let d = `M ${regions[0]!.x} ${regions[0]!.y}`;
  for (let i = 1; i < regions.length; i++) {
    const prev = regions[i - 1]!;
    const curr = regions[i]!;
    const midX = (prev.x + curr.x) / 2;
    const midY = Math.min(prev.y, curr.y) - 12;
    d += ` Q ${midX} ${midY} ${curr.x} ${curr.y}`;
  }
  return d;
}

function MapPage() {
  const { t } = useTranslation();
  const game = useGame();
  const level = levelFromXp(game.xp);
  const [selected, setSelected] = useState<WorldRegion | null>(null);

  const roadPath = buildRoadPath(WORLD_REGIONS);

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

      {/* Map frame — parchment feel with terrain background */}
      <div
        className="relative mx-auto mt-8 aspect-[3/4] w-full max-w-md overflow-hidden rounded-2xl border-2 shadow-[0_-8px_30px_-12px_rgb(60_45_15/0.4)]"
        style={{
          borderColor: "color-mix(in oklab, var(--primary) 55%, transparent)",
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--primary) 10%, #fbf3de) 0%, color-mix(in oklab, var(--accent) 14%, #f3e6c4) 55%, color-mix(in oklab, var(--primary) 18%, #e9d6a8) 100%)",
        }}
      >
        {/* Decorative inner border */}
        <div
          className="pointer-events-none absolute inset-2 rounded-xl border"
          style={{ borderColor: "color-mix(in oklab, var(--primary) 35%, transparent)" }}
        />

        <svg viewBox="0 0 100 130" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          {/* Sky gradient */}
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="color-mix(in oklab, var(--accent) 25%, transparent)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient id="mountainGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="color-mix(in oklab, var(--primary) 35%, #8b7250)" />
              <stop offset="100%" stopColor="color-mix(in oklab, var(--primary) 15%, #8b7250)" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width="100" height="40" fill="url(#skyGrad)" />

          {/* Background mountain range */}
          <path
            d="M0,38 L10,22 L18,32 L28,14 L38,30 L48,20 L58,34 L68,18 L78,30 L88,20 L100,34 L100,42 L0,42 Z"
            fill="url(#mountainGrad)"
            opacity="0.55"
          />
          <path
            d="M0,42 L14,30 L26,40 L40,26 L54,40 L66,28 L80,40 L92,30 L100,40 L100,48 L0,48 Z"
            fill="color-mix(in oklab, var(--primary) 30%, #6b5638)"
            opacity="0.5"
          />

          {/* Rolling hills / terrain texture across the map */}
          <path
            d="M0,60 Q15,54 30,60 T60,60 T100,58 L100,130 L0,130 Z"
            fill="color-mix(in oklab, var(--accent) 22%, transparent)"
          />
          <path
            d="M0,80 Q20,74 40,80 T80,78 T100,82 L100,130 L0,130 Z"
            fill="color-mix(in oklab, var(--primary) 12%, transparent)"
          />

          {/* Scattered pine trees for the forest region */}
          {[
            [42, 24],
            [46, 20],
            [50, 26],
            [55, 22],
          ].map(([tx, ty], i) => (
            <path
              key={i}
              d={`M ${tx} ${ty! + 5} L ${tx! - 2.2} ${ty! + 5} L ${tx} ${ty} Z M ${tx! - 1.6} ${ty! + 3.4} L ${tx! + 1.6} ${ty! + 3.4} L ${tx} ${ty! - 1} Z`}
              fill="color-mix(in oklab, var(--primary) 40%, #4a5c3a)"
              opacity="0.7"
            />
          ))}

          {/* Winding road connecting regions */}
          <path
            d={roadPath}
            fill="none"
            stroke="color-mix(in oklab, var(--primary) 70%, #8b6d3a)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeDasharray="0.5 3.2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Region markers */}
        {WORLD_REGIONS.map((region) => {
          const unlocked = isRegionUnlocked(region, game.xp);
          const Icon = REGION_ICON[region.icon];
          const yPct = (region.y / 130) * 100;
          return (
            <button
              key={region.id}
              type="button"
              onClick={() => unlocked && setSelected(region)}
              disabled={!unlocked}
              className="absolute flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${region.x}%`, top: `${yPct}%` }}
              aria-label={region.name}
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] transition-all duration-300"
                style={{
                  borderColor: unlocked ? "var(--primary)" : "color-mix(in oklab, var(--muted-foreground) 60%, transparent)",
                  background: unlocked
                    ? "radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--primary) 45%, white 10%), color-mix(in oklab, var(--primary) 20%, var(--card)))"
                    : "color-mix(in oklab, var(--muted-foreground) 14%, var(--card))",
                  boxShadow: unlocked
                    ? "0 0 0 4px color-mix(in oklab, var(--primary) 18%, transparent), 0 4px 14px -2px color-mix(in oklab, var(--primary) 60%, transparent)"
                    : "0 2px 6px -2px rgb(0 0 0 / 0.25)",
                }}
              >
                {unlocked ? (
                  <Icon className="h-6 w-6 text-primary drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" strokeWidth={2.2} />
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" strokeWidth={2.2} />
                )}
              </span>
              <span
                className="rounded-full px-2 py-0.5 font-display text-[0.55rem] font-bold uppercase tracking-[0.1em]"
                style={{
                  color: unlocked ? "var(--primary-foreground, #2a1c08)" : "var(--muted-foreground)",
                  background: unlocked
                    ? "color-mix(in oklab, var(--primary) 85%, transparent)"
                    : "color-mix(in oklab, var(--card) 80%, transparent)",
                  boxShadow: unlocked ? "0 2px 6px -2px rgba(0,0,0,0.35)" : "none",
                }}
              >
                {unlocked ? region.name : `Lv.${region.levelReq}`}
              </span>
            </button>
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
          {level < 8
            ? t("map.hint", "Grow your legend to unlock new regions of Aethora.")
            : t("map.hintAll", "Tap a region to view its trials.")}
        </p>
      )}
    </div>
  );
}