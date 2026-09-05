import { useEffect, useRef, useState } from "react";
import { Mountain, ShieldCheck, Swords, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { useGame } from "@/lib/game-store";
import { IRON_GOLEM, bossDefeated, bossHpRemaining } from "@/lib/game-data";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

/*
 * P1.3: the Iron Golem — an abstract, gamified boss. Every conquered trial
 * chips 10 HP from the sentinel; Warden's Lower Keep is the themed finishing
 * blow. Purely fictional damage — never a health or body metric.
 */

const QUAKE_MS = 600;

export function IronGolem() {
  const { t } = useTranslation();
  const game = useGame();

  const hp = bossHpRemaining(IRON_GOLEM, game.trialsEver);
  const defeated = bossDefeated(IRON_GOLEM, game.trialsEver);
  const hpRatio = hp / IRON_GOLEM.hp;

  // Trigger the quake animation once whenever the golem takes damage.
  const prevTrialsRef = useRef(game.trialsEver.length);
  const [quaking, setQuaking] = useState(false);

  useEffect(() => {
    const before = prevTrialsRef.current;
    prevTrialsRef.current = game.trialsEver.length;
    if (game.trialsEver.length <= before) return;
    setQuaking(true);
    const timer = setTimeout(() => setQuaking(false), QUAKE_MS);
    return () => clearTimeout(timer);
  }, [game.trialsEver.length]);

  const hpFillStyle = {
    background:
      hpRatio > 0.5
        ? "linear-gradient(90deg, color-mix(in oklab, var(--stat-strength) 55%, white 10%), var(--stat-strength))"
        : "linear-gradient(90deg, color-mix(in oklab, var(--destructive) 55%, white 10%), var(--destructive))",
  } as CSSProperties;

  return (
    <RunePanel className={cn("boss-panel", quaking && "boss-quake")}>
      <RuneHeading>{t("boss.title", "The Iron Golem")}</RuneHeading>

      <div className="mt-3 flex items-start gap-3">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--stat-strength)_45%,transparent)] bg-[color-mix(in_oklab,var(--stat-strength)_12%,var(--card))] text-stat-strength shadow-[0_0_16px_color-mix(in_oklab,var(--stat-strength)_30%,transparent)]",
            defeated && "boss-defeated-glow",
          )}
          aria-hidden="true"
        >
          {defeated ? <Trophy className="h-6 w-6" /> : <Mountain className="h-6 w-6" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold uppercase tracking-[0.14em] text-stat-strength">
            {IRON_GOLEM.name}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {defeated
              ? t(
                  "boss.defeated",
                  "The sentinel has crumbled. The mountain pass is yours, champion.",
                )
              : IRON_GOLEM.epithet}
          </p>
        </div>
      </div>

      {defeated ? (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-md border border-primary/45 bg-primary/10 py-3">
          <Trophy className="h-4 w-4 text-primary" />
          <span className="font-display text-[0.7rem] font-bold uppercase tracking-[0.22em] text-primary">
            {t("boss.vanquished", "Vanquished")}
          </span>
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-end justify-between gap-2">
            <span className="font-display text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
              {t("boss.sentinelHp", "Sentinel HP")}
            </span>
            <span className="font-display text-sm font-bold text-foreground">
              {hp} <span className="text-muted-foreground">/ {IRON_GOLEM.hp}</span>
            </span>
          </div>
          <div className="bar-track mt-2 !h-3">
            <div
              className="boss-hp-fill bar-fill"
              style={{ width: `${Math.max(0, hpRatio * 100)}%`, ...hpFillStyle }}
            />
          </div>

          <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <Swords className="h-3.5 w-3.5 shrink-0 text-stat-strength" aria-hidden="true" />
              {t("boss.damageNote", "Every conquered trial strikes the golem for 10 damage.", {
                damage: IRON_GOLEM.damagePerTrial,
              })}
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-stat-strength" aria-hidden="true" />
              {t("boss.finisherNote", "Warden's Lower Keep is the finishing blow.")}
            </p>
          </div>
        </>
      )}
    </RunePanel>
  );
}
