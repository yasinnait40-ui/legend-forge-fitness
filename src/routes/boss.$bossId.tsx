import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Skull, Check, Star, Clock } from "lucide-react";
import { RunePanel } from "@/components/RunePanel";
import { completeTrial, trialsDoneToday, useGame } from "@/lib/game-store";
import { TRIALS, type Trial } from "@/lib/game-data";
import { useGameText } from "@/lib/game-i18n";
import { playSound } from "@/lib/sound-store";
import { announceRewards } from "@/lib/rewards";
import { cn } from "@/lib/utils";
import { bossById } from "@/lib/boss-data";
import { damageBoss, isBossDefeated, remainingHp, useBossStore } from "@/lib/boss-store";

export const Route = createFileRoute("/boss/$bossId")({
  head: () => ({ meta: [{ title: "Boss Trial — AETHORA" }] }),
  component: BossPage,
});

interface FloatingHit {
  id: number;
  amount: number;
}

function BossPage() {
  const { t } = useTranslation();
  const g = useGameText();
  const { bossId } = useParams({ from: "/boss/$bossId" });
  const boss = bossById(bossId);
  const game = useGame();
  useBossStore();
  const done = trialsDoneToday(game);
  const [openId, setOpenId] = useState<string | null>(TRIALS[0]?.id ?? null);
  const [justDefeated, setJustDefeated] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [hits, setHits] = useState<FloatingHit[]>([]);

  if (!boss) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <p className="text-muted-foreground">{t("boss.notFound", "This foe cannot be found.")}</p>
      </div>
    );
  }

  const hp = remainingHp(boss.id, boss.maxHp);
  const defeated = isBossDefeated(boss.id);
  const hpRatio = Math.max(0, hp / boss.maxHp);

  async function handleAttack(trial: Trial) {
    const result = await completeTrial(trial.id, trial.name, trial.xp, trial.stats);
    if (!result) return;
    playSound(result.leveledUp ? "levelUp" : "questComplete");
    announceRewards(result, t("trials.conqueredToast", { name: g.trial(trial).name }));

    // Impact feedback: shake, flash, floating damage number.
    setShaking(true);
    setFlashing(true);
    const hitId = Date.now();
    setHits((prev) => [...prev, { id: hitId, amount: trial.xp }]);
    setTimeout(() => setShaking(false), 400);
    setTimeout(() => setFlashing(false), 200);
    setTimeout(() => setHits((prev) => prev.filter((h) => h.id !== hitId)), 1200);

    const killedNow = damageBoss(boss.id, boss.maxHp, trial.xp);
    if (killedNow) {
      playSound("levelUp");
      setTimeout(() => setJustDefeated(true), 500);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-10">
      <style>{`
        @keyframes boss-shake {
          0%, 100% { transform: translate(0, 0); }
          20% { transform: translate(-6px, 2px); }
          40% { transform: translate(5px, -3px); }
          60% { transform: translate(-4px, -2px); }
          80% { transform: translate(3px, 3px); }
        }
        @keyframes damage-float {
          0% { opacity: 0; transform: translate(-50%, 0) scale(0.7); }
          15% { opacity: 1; transform: translate(-50%, -10px) scale(1.1); }
          100% { opacity: 0; transform: translate(-50%, -70px) scale(1); }
        }
        @keyframes burst-ring {
          0% { opacity: 0.8; transform: scale(0.3); }
          100% { opacity: 0; transform: scale(2.4); }
        }
        .boss-shaking { animation: boss-shake 0.4s ease-in-out; }
        .damage-number { animation: damage-float 1.1s ease-out forwards; }
        .burst-ring { animation: burst-ring 1.4s ease-out infinite; }
      `}</style>

      <header className="text-center">
        <p className="font-display text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">
          {t("boss.trial", "Boss Trial")}
        </p>
        <h1 className="text-glow-gold font-display mt-1 text-3xl font-black tracking-[0.08em] text-primary">
          {boss.name}
        </h1>
        <p className="mt-2 text-xs italic text-muted-foreground">{boss.epithet}</p>
      </header>

      <div
        className={cn(
          "relative mx-auto mt-6 aspect-square w-full max-w-xs overflow-hidden rounded-2xl border-2",
          shaking && "boss-shaking",
        )}
        style={{
          borderColor: defeated
            ? "color-mix(in oklab, var(--muted-foreground) 50%, transparent)"
            : "color-mix(in oklab, #b23b3b 55%, transparent)",
          boxShadow: defeated ? "none" : "0 0 30px -6px color-mix(in oklab, #b23b3b 55%, transparent)",
        }}
      >
        <img
          src={boss.image}
          alt={boss.name}
          className={cn(
            "h-full w-full object-cover transition-all duration-700",
            defeated && "grayscale opacity-60",
          )}
        />

        {/* Hit flash overlay */}
        <div
          className="pointer-events-none absolute inset-0 bg-red-500 transition-opacity duration-150"
          style={{ opacity: flashing ? 0.35 : 0 }}
        />

        {/* Floating damage numbers */}
        {hits.map((hit) => (
          <span
            key={hit.id}
            className="damage-number pointer-events-none absolute left-1/2 top-1/2 font-display text-2xl font-black text-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
          >
            -{hit.amount}
          </span>
        ))}

        {defeated && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="font-display rounded-full border-2 border-primary bg-background/80 px-4 py-1.5 text-sm font-black uppercase tracking-[0.2em] text-primary">
              {t("boss.defeated", "Defeated")}
            </span>
          </div>
        )}
      </div>

      <RunePanel className="mx-auto mt-5 max-w-xs">
        <div className="flex items-center justify-between">
          <span className="font-display text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
            {t("boss.hp", "HP")}
          </span>
          <span className="font-display text-xs font-bold">
            {hp} / {boss.maxHp}
          </span>
        </div>
        <div className="bar-track mt-2 !h-3">
          <div
            className="bar-fill transition-all duration-700 ease-out"
            style={{
              width: `${Math.max(defeated ? 0 : 3, hpRatio * 100)}%`,
              background: defeated
                ? "var(--muted-foreground)"
                : "linear-gradient(90deg, color-mix(in oklab, #b23b3b 60%, black 10%), #b23b3b)",
              boxShadow: defeated ? "none" : "0 0 14px color-mix(in oklab, #b23b3b 65%, transparent)",
            }}
          />
        </div>
      </RunePanel>

      {!defeated && (
        <>
          <p className="mx-auto mt-6 max-w-xs text-center text-xs text-muted-foreground">
            {t("boss.instructions", "Every trial you conquer strikes this foe. Choose your attack.")}
          </p>
          <div className="mt-4 space-y-4">
            {TRIALS.map((trial) => {
              const isDone = done.includes(trial.id);
              const open = openId === trial.id;
              const tt = g.trial(trial);
              return (
                <RunePanel key={trial.id} className={cn(isDone && "border-primary/50")}>
                  <button
                    className="flex w-full items-start justify-between gap-3 text-left"
                    onClick={() => setOpenId(open ? null : trial.id)}
                    aria-expanded={open}
                  >
                    <div className="min-w-0">
                      <h3 className="font-display text-base font-bold tracking-[0.05em]">{tt.name}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="flex" aria-label={`Difficulty ${trial.difficulty} of 5`}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "h-3.5 w-3.5",
                                i < trial.difficulty ? "fill-primary text-primary" : "text-muted-foreground/40",
                              )}
                            />
                          ))}
                        </span>
                        <span className="rune-chip">
                          <Clock className="h-3 w-3" /> {trial.minutes} {t("trials.minutes", "min")}
                        </span>
                        <span className="rune-chip" style={{ color: "#b23b3b" }}>
                          <Skull className="h-3 w-3" /> -{trial.xp} HP
                        </span>
                      </div>
                    </div>
                  </button>
                  {open && (
                    <div className="mt-3 border-t border-primary/15 pt-3">
                      <div className="space-y-2">
                        {trial.exercises.map((_ex, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/55 px-3 py-2"
                          >
                            <span className="flex items-center gap-2 text-sm">
                              <span className="text-primary">✦</span>
                              {tt.exercises[i]?.name}
                            </span>
                            <span className="font-display shrink-0 text-sm font-bold text-primary">
                              {tt.exercises[i]?.sets}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3">
                        {isDone ? (
                          <div className="flex items-center justify-center gap-2 rounded-md border border-primary/45 bg-primary/10 py-2.5">
                            <Check className="h-4 w-4 text-primary" />
                            <span className="font-display text-[0.7rem] font-bold uppercase tracking-[0.22em] text-primary">
                              {t("trials.conqueredToday", "Conquered Today")}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAttack(trial)}
                            className="flex w-full items-center justify-center gap-2 rounded-md border py-2.5 transition active:scale-95"
                            style={{
                              borderColor: "color-mix(in oklab, #b23b3b 45%, transparent)",
                              background: "color-mix(in oklab, #b23b3b 12%, transparent)",
                            }}
                          >
                            <Skull className="h-4 w-4" style={{ color: "#b23b3b" }} />
                            <span
                              className="font-display text-[0.7rem] font-bold uppercase tracking-[0.18em]"
                              style={{ color: "#b23b3b" }}
                            >
                              {t("boss.strike", "Strike the Beast")}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </RunePanel>
              );
            })}
          </div>
        </>
      )}

      {defeated && !justDefeated && (
        <div className="mx-auto mt-6 max-w-xs text-center">
          <p className="text-glow-gold font-display text-lg font-black text-primary">
            {t("boss.victory", "Victory!")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("boss.victoryDesc", "The realm remembers this triumph.")}
          </p>
          <Link to="/map" className="btn-gold mt-4 inline-block !w-auto px-6">
            {t("boss.returnToMap", "Return to the Map")}
          </Link>
        </div>
      )}

      {justDefeated && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6">
          {/* Radiating gold rings burst */}
          <div className="pointer-events-none absolute flex items-center justify-center">
            <span className="burst-ring absolute h-40 w-40 rounded-full border-2 border-primary" />
            <span className="burst-ring absolute h-40 w-40 rounded-full border-2 border-primary" style={{ animationDelay: "0.4s" }} />
            <span className="burst-ring absolute h-40 w-40 rounded-full border-2 border-primary" style={{ animationDelay: "0.8s" }} />
          </div>

          <div className="relative max-w-sm rounded-2xl border-2 border-primary bg-card p-6 text-center shadow-[0_0_60px_-10px_var(--primary)]">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
              {t("boss.slain", "Slain")}
            </p>
            <h2 className="text-glow-gold font-display mt-2 text-2xl font-black text-primary">{boss.name}</h2>
            <button onClick={() => setJustDefeated(false)} className="btn-gold mt-5 !w-auto px-8">
              {t("boss.claim", "Claim Victory")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
                  }
