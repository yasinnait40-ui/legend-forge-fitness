import { createFileRoute } from "@tanstack/react-router";
import { Flame, ScrollText, Swords } from "lucide-react";
import observatory from "@/assets/observatory.jpg";
import { RealmScreen } from "@/components/RealmScreen";
import { FantasyCharacter } from "@/components/FantasyCharacter";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { todayKey, useGame } from "@/lib/game-store";
import {
  levelProgress,
  STAT_ORDER,
  STAT_CAP,
  type StatKey,
} from "@/lib/game-data";
import { useTranslation } from "react-i18next";
import { useGameText } from "@/lib/game-i18n";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "The Observatory — Progress & Chronicle | AETHORA" },
      {
        name: "description",
        content:
          "A magical observatory reveals your legend: level, XP, weekly activity, stat constellation, workout chronicle, streaks and personal records.",
      },
      { property: "og:title", content: "The Observatory — Progress & Chronicle | AETHORA" },
      {
        property: "og:description",
        content: "Watch your legend take shape among the stars of the observatory.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgressPage,
});

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const STAT_SHORT: Record<StatKey, string> = {
  strength: "STR",
  endurance: "END",
  agility: "AGI",
  vitality: "VIT",
  recovery: "REC",
};

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function StatConstellation({ stats }: { stats: Record<StatKey, number> }) {
  const cx = 110;
  const cy = 105;
  const r = 72;
  const angles = STAT_ORDER.map((_, i) => -90 + i * 72);

  const ringPoints = (scale: number) =>
    angles.map((a) => polar(cx, cy, r * scale, a).join(",")).join(" ");

  const valuePoints = STAT_ORDER.map((s, i) => {
    const scale = Math.max(0.08, (stats[s] ?? 0) / STAT_CAP);
    return polar(cx, cy, r * scale, angles[i] ?? 0).join(",");
  }).join(" ");

  return (
    <svg
      viewBox="0 0 220 210"
      className="mx-auto w-full max-w-[300px]"
      role="img"
      aria-label="Stat constellation radar chart"
    >
      {[0.33, 0.66, 1].map((s) => (
        <polygon
          key={s}
          points={ringPoints(s)}
          fill="none"
          stroke="color-mix(in oklab, var(--accent) 30%, transparent)"
          strokeWidth="1"
        />
      ))}
      {angles.map((a, i) => {
        const [x, y] = polar(cx, cy, r, a);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="color-mix(in oklab, var(--accent) 22%, transparent)"
            strokeWidth="1"
          />
        );
      })}
      <polygon
        points={valuePoints}
        fill="color-mix(in oklab, var(--primary) 26%, transparent)"
        stroke="var(--primary)"
        strokeWidth="1.6"
        style={{
          filter: "drop-shadow(0 0 8px color-mix(in oklab, var(--primary) 60%, transparent))",
        }}
      />
      {STAT_ORDER.map((s, i) => {
        const scale = Math.max(0.08, (stats[s] ?? 0) / STAT_CAP);
        const [x, y] = polar(cx, cy, r * scale, angles[i] ?? 0);
        return <circle key={s} cx={x} cy={y} r="3" fill="var(--primary)" />;
      })}
      {STAT_ORDER.map((s, i) => {
        const [x, y] = polar(cx, cy, r + 17, angles[i] ?? 0);
        return (
          <text
            key={s}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--muted-foreground)"
            fontSize="9"
            fontFamily="Cinzel, serif"
            fontWeight="700"
            letterSpacing="1"
          >
            {STAT_SHORT[s]}
          </text>
        );
      })}
      <circle cx={cx} cy={cy} r="2.5" fill="var(--accent)" />
    </svg>
  );
}

function formatChronicleDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function ProgressPage() {
  const { t } = useTranslation();
  const g = useGameText();
  const game = useGame();
  const { level, intoLevel, needed, ratio } = levelProgress(game.xp);

  const week: { label: string; xp: number; isToday: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = todayKey(d);
    const entry = game.activityLog.find((e) => e.date === key);
    week.push({ label: DAY_LETTERS[d.getDay()] ?? "", xp: entry?.xp ?? 0, isToday: i === 0 });
  }
  const maxXp = Math.max(50, ...week.map((w) => w.xp));

  return (
    <RealmScreen
      image={observatory}
      alt="A magical observatory with a golden astrolabe and floating star charts"
      imagePosition="center 35%"
    >
      <header className="pt-10 text-center">
        <RuneHeading>{t("progress.observatory", "The Observatory")}</RuneHeading>
        <h1 className="text-glow-gold font-display mt-3 text-3xl font-black tracking-[0.08em] text-primary">
          {t("progress.title", "Your Legend")}
        </h1>
        <p className="mt-2 text-xs tracking-wide text-muted-foreground">
          {g.title(level)} · {game.xp.toLocaleString()} {t("progress.totalXp", "total XP")}
        </p>
      </header>

      <RunePanel className="mt-6 overflow-hidden">
        <RuneHeading>{t("characters.welcome.hakari", "Sacred Companions")}</RuneHeading>
        <div className="grid grid-cols-2 items-start gap-3 md:gap-12">
          <div className="min-w-0 rounded-lg border border-border/60 bg-background/20 p-1 md:p-4">
            <FantasyCharacter kind="hakari" embedded dialogue={t("characters.welcome.hakari", "You are growing up today!")} />
          </div>
          <div className="min-w-0 rounded-lg border border-border/60 bg-background/20 p-1 md:p-4">
            <FantasyCharacter kind="sprite" embedded dialogue={t("characters.welcome.sprite")} />
          </div>
        </div>
      </RunePanel>

      {/* Level */}
      <RunePanel className="mt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">
              {t("progress.currentLevel", "Current Level")}
            </p>
            <p className="text-glow-gold font-display text-4xl font-black text-primary">{level}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">
              {t("progress.nextAscension", "Next Ascension")}
            </p>
            <p className="font-display text-sm font-bold">
              {intoLevel} / {needed} XP
            </p>
          </div>
        </div>
        <div className="bar-track mt-3 !h-2.5">
          <div
            className="bar-fill"
            style={{
              width: `${Math.max(2, ratio * 100)}%`,
              background:
                "linear-gradient(90deg, color-mix(in oklab, var(--primary) 50%, black 30%), var(--primary))",
              boxShadow: "0 0 16px color-mix(in oklab, var(--primary) 70%, transparent)",
            }}
          />
        </div>
      </RunePanel>

      {/* Weekly activity */}
      <RunePanel className="mt-4">
        <RuneHeading>{t("progress.weeklyConquests", "Weekly Conquests")}</RuneHeading>
        <div className="mt-4 flex h-28 items-end justify-between gap-2">
          {week.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="font-display text-[0.58rem] font-bold text-primary">
                {d.xp > 0 ? d.xp : ""}
              </span>
              <div
                className="w-full max-w-7 rounded-t-sm transition-all duration-700"
                style={{
                  height: `${Math.max(4, (d.xp / maxXp) * 72)}px`,
                  background: d.isToday
                    ? "linear-gradient(180deg, var(--primary), color-mix(in oklab, var(--primary) 40%, transparent))"
                    : "linear-gradient(180deg, color-mix(in oklab, var(--accent) 80%, transparent), color-mix(in oklab, var(--accent) 20%, transparent))",
                  boxShadow:
                    d.xp > 0
                      ? `0 0 12px color-mix(in oklab, ${d.isToday ? "var(--primary)" : "var(--accent)"} 40%, transparent)`
                      : "none",
                  opacity: d.xp > 0 ? 1 : 0.25,
                }}
              />
              <span
                className={
                  d.isToday
                    ? "font-display text-[0.6rem] font-bold text-primary"
                    : "font-display text-[0.6rem] text-muted-foreground"
                }
              >
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </RunePanel>

      {/* Stat constellation */}
      <RunePanel className="mt-4">
        <RuneHeading>{t("progress.statConstellation", "Stat Constellation")}</RuneHeading>
        <div className="mt-2">
          <StatConstellation stats={game.stats} />
        </div>
        <div className="mt-1 flex flex-wrap justify-center gap-1.5">
          {STAT_ORDER.map((s) => (
            <span key={s} className="rune-chip" style={{ color: `var(--stat-${s})` }}>
              {g.stat(s)} {game.stats[s]}
            </span>
          ))}
        </div>
      </RunePanel>

      {/* Records */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <RunePanel className="text-center !p-3">
          <Swords className="mx-auto h-5 w-5 text-primary" />
          <p className="font-display mt-1 text-xl font-black">{game.totalTrials}</p>
          <p className="text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground">
            {t("progress.trialsWon", "Trials Won")}
          </p>
        </RunePanel>
        <RunePanel className="text-center !p-3">
          <ScrollText className="mx-auto h-5 w-5 text-accent" />
          <p className="font-display mt-1 text-xl font-black">{game.totalQuests}</p>
          <p className="text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground">
            {t("progress.questsSealed", "Quests Sealed")}
          </p>
        </RunePanel>
        <RunePanel className="text-center !p-3">
          <Flame className="mx-auto h-5 w-5 text-stat-strength" />
          <p className="font-display mt-1 text-xl font-black">{game.bestStreak}</p>
          <p className="text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground">
            {t("progress.longestFlame", "Longest Flame")}
          </p>
        </RunePanel>
      </div>

      {/* Chronicle */}
      <RunePanel className="mt-4">
        <RuneHeading>{t("progress.chronicle", "The Chronicle")}</RuneHeading>
        {game.workoutLog.length === 0 ? (
          <p className="mt-3 text-sm italic text-muted-foreground">
            {t("progress.noDeeds", "No deeds recorded yet. Conquer a trial and the scribes will write of you.")}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {[...game.workoutLog]
              .reverse()
              .slice(0, 8)
              .map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/55 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{entry.name}</p>
                    <p className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
                      {formatChronicleDate(entry.date)}
                    </p>
                  </div>
                  <span className="rune-chip shrink-0 text-primary">+{entry.xp} XP</span>
                </div>
              ))}
          </div>
        )}
      </RunePanel>
    </RealmScreen>
  );
}
