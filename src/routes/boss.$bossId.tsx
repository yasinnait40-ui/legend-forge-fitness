import type { CSSProperties } from "react";
import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Heart, HeartCrack, RotateCcw, Shield, Skull, Swords, Check, Star, Clock } from "lucide-react";
import { RunePanel } from "@/components/RunePanel";
import { completeTrial, trialsDoneToday, useGame } from "@/lib/game-store";
import { itemById, TRIALS, type Trial } from "@/lib/game-data";
import { useGameText } from "@/lib/game-i18n";
import { playSound } from "@/lib/sound-store";
import { announceRewards } from "@/lib/rewards";
import { showInterstitialAd } from "@/components/NativeAds";
import { cn } from "@/lib/utils";
import { bossById } from "@/lib/boss-data";
import {
  PLAYER_MAX_HP,
  damageBoss,
  damagePlayer,
  healPlayer,
  isBossDefeated,
  isPlayerFallen,
  playerHpRemaining,
  remainingHp,
  useBossStore,
} from "@/lib/boss-store";

export const Route = createFileRoute("/boss/$bossId")({
  head: () => ({ meta: [{ title: "Boss Trial — AETHORA" }] }),
  component: BossPage,
});

interface FloatingHit {
  id: number;
  amount: number;
  /** True when the damage landed on the hero (boss counter-attack). */
  player?: boolean;
}

/** One particle in the spark burst fired when a strike button is pressed. */
interface Spark {
  id: number;
  trialId: string;
  dx: number;
  dy: number;
  delay: number;
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
  const [fallen, setFallen] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [hits, setHits] = useState<FloatingHit[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [pressedId, setPressedId] = useState<string | null>(null);

  // Equipped gear shapes this battle: the weapon's damageBonus adds to every
  // strike, and the armor's defenseBonus shaves the boss's counter-attacks.
  const weapon = itemById(game.equipment.weapon);
  const armor = itemById(game.equipment.armor);
  const weaponBonus = weapon?.damageBonus ?? 0;
  const armorBonus = armor?.defenseBonus ?? 0;

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
  const playerHp = playerHpRemaining(boss.id);
  const playerRatio = Math.max(0, playerHp / PLAYER_MAX_HP);

  /** Satisfying press feedback: glow pulse + spark burst around the button. */
  function fireStrikeEffects(trialId: string) {
    const base = Date.now();
    const burst: Spark[] = Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.6;
      const dist = 26 + Math.random() * 22;
      return {
        id: base + i,
        trialId,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        delay: Math.floor(Math.random() * 60),
      };
    });
    setSparks((prev) => [...prev, ...burst]);
    setPressedId(trialId);
    setTimeout(
      () => setPressedId((cur) => (cur === trialId ? null : cur)),
      360,
    );
    setTimeout(
      () => setSparks((prev) => prev.filter((s) => !burst.some((b) => b.id === s.id))),
      700,
    );
  }

  async function handleAttack(trial: Trial) {
    const result = await completeTrial(trial.id, trial.name, trial.xp, trial.stats);
    if (!result) return;
    playSound(result.leveledUp ? "levelUp" : "questComplete");
    announceRewards(result, t("trials.conqueredToast", { name: g.trial(trial).name }));

    // The equipped weapon's damageBonus is added to every strike.
    const damage = trial.xp + weaponBonus;

    // Impact feedback: shake, flash, floating damage number.
    setShaking(true);
    setFlashing(true);
    const hitId = Date.now();
    setHits((prev) => [...prev, { id: hitId, amount: damage }]);
    setTimeout(() => setShaking(false), 400);
    setTimeout(() => setFlashing(false), 200);
    setTimeout(() => setHits((prev) => prev.filter((h) => h.id !== hitId)), 1200);

    if (!boss) return;
    const killedNow = damageBoss(boss.id, boss.maxHp, damage);
    if (killedNow) {
      playSound("bossHit");
      setTimeout(() => setJustDefeated(true), 500);
      return;
    }

    // The boss fights back — a random counter-attack, softened by armor.
    const raw = 12 + Math.floor(Math.random() * 17); // 12–28
    const mitigated = Math.max(2, raw - armorBonus);
    const fell = damagePlayer(boss.id, mitigated);
    playSound("battleHit");
    const playerHitId = Date.now() + 1;
    setHits((prev) => [...prev, { id: playerHitId, amount: mitigated, player: true }]);
    setTimeout(() => setHits((prev) => prev.filter((h) => h.id !== playerHitId)), 1200);
    if (fell) {
      setTimeout(() => setFallen(true), 450);
    }
  }

  function riseAgain() {
    if (!boss) return;
    healPlayer(boss.id);
    setFallen(false);
    setHits([]);
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
        @keyframes spark-fly {
          0% { opacity: 0.95; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0.3); }
        }
        @keyframes strike-press-glow {
          0% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--boss-accent) 55%, transparent); }
          45% { box-shadow: 0 0 18px 4px color-mix(in oklab, var(--boss-accent) 55%, transparent); }
          100% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--boss-accent) 55%, transparent); }
        }
        .boss-shaking { animation: boss-shake 0.4s ease-in-out; }
        .damage-number { animation: damage-float 1.1s ease-out forwards; }
        .burst-ring { animation: burst-ring 1.4s ease-out infinite; }
        .strike-pressed { animation: strike-press-glow 0.36s ease-out; }
        .spark-particle { animation: spark-fly 0.55s ease-out forwards; }
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

      {/* The beast in its pool of magical light — centered, moderate size,
          breathing slowly. The shake lives on this wrapper so it can't fight
          the image's breathing animation (both would set `animation`). */}
      <div
        className={cn(
          "relative mx-auto mt-6 flex aspect-square w-full max-w-[17rem] items-center justify-center",
          shaking && "boss-shaking",
        )}
      >
        {/* Soft radial aura in the boss's accent hue */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 rounded-full transition-opacity duration-700",
            defeated ? "opacity-0" : "boss-latent-glow",
          )}
          style={{
            "--boss-accent": `oklch(0.62 0.16 ${boss.accentHue})` as const,
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--boss-accent) 34%, transparent) 0%, color-mix(in oklab, var(--boss-accent) 14%, transparent) 45%, transparent 70%)",
          }}
        />
        {/* Inner glow ring hugging the portrait */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-8 rounded-full transition-opacity duration-700",
            defeated ? "opacity-0" : "",
          )}
          style={{
            "--boss-accent": `oklch(0.62 0.16 ${boss.accentHue})` as const,
            boxShadow:
              "0 0 44px -4px color-mix(in oklab, var(--boss-accent) 55%, transparent), inset 0 0 30px -6px color-mix(in oklab, var(--boss-accent) 30%, transparent)",
          }}
        />
        {/* Framed circular portrait — breathing via the img's own animation,
            never on this wrapper (shake owns it). */}
        <div
          className="relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border-2 sm:h-48 sm:w-48"
          style={{
            "--boss-accent": `oklch(0.62 0.16 ${boss.accentHue})` as const,
            borderColor: defeated
              ? "color-mix(in oklab, var(--muted-foreground) 50%, transparent)"
              : "color-mix(in oklab, var(--boss-accent) 55%, transparent)",
          }}
        >
          <img
            src={boss.image}
            alt={boss.name}
            className={cn(
              "h-full w-full scale-[1.08] object-cover transition-all duration-700",
              !defeated && "boss-breathing",
              defeated && "grayscale opacity-60 boss-defeated-settle",
            )}
          />

          {/* Hit flash overlay */}
          <div
            className="pointer-events-none absolute inset-0 bg-red-500 transition-opacity duration-150"
            style={{ opacity: flashing ? 0.35 : 0 }}
          />
        </div>

        {/* Floating damage numbers — boss hits from the center, counter-attacks from below */}
        {hits.map((hit) => (
          <span
            key={hit.id}
            className={cn(
              "damage-number pointer-events-none absolute left-1/2 font-display text-2xl font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]",
              hit.player ? "top-[78%] text-red-400" : "top-1/2 text-red-500",
            )}
          >
            -{hit.amount}
          </span>
        ))}

        {defeated && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display rounded-full border-2 border-primary bg-background/80 px-4 py-1.5 text-sm font-black uppercase tracking-[0.2em] text-primary">
              {t("boss.defeated", "Defeated")}
            </span>
          </div>
        )}
      </div>

      <RunePanel className="mx-auto mt-5 max-w-xs">
        <div className="flex items-center justify-between">
          <span className="font-display flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
            <Skull className="h-3 w-3" style={{ color: "var(--boss-accent)" }} />
            {boss.name}
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
                : "linear-gradient(90deg, color-mix(in oklab, var(--boss-accent) 60%, black 10%), var(--boss-accent))",
              boxShadow: defeated
                ? "none"
                : "0 0 14px color-mix(in oklab, var(--boss-accent) 65%, transparent)",
            }}
          />
        </div>
      </RunePanel>

      {/* Player HP — the boss fights back, armor softens the blows */}
      <RunePanel className="mx-auto mt-3 max-w-xs">
        <div className="flex items-center justify-between">
          <span className="font-display flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
            <Heart
              className={cn(
                "h-3 w-3",
                isPlayerFallen(boss.id) ? "text-muted-foreground" : "text-red-400",
              )}
            />
            {t("boss.yourHp", "Your HP")}
          </span>
          <span className="font-display text-xs font-bold">
            {playerHp} / {PLAYER_MAX_HP}
          </span>
        </div>
        <div className="bar-track mt-2 !h-3">
          <div
            className="bar-fill transition-all duration-700 ease-out"
            style={{
              width: `${Math.max(isPlayerFallen(boss.id) ? 0 : 3, playerRatio * 100)}%`,
              background: isPlayerFallen(boss.id)
                ? "var(--muted-foreground)"
                : "linear-gradient(90deg, oklch(0.62 0.19 25) 0%, oklch(0.66 0.2 25) 100%)",
              boxShadow: isPlayerFallen(boss.id)
                ? "none"
                : "0 0 14px color-mix(in oklab, oklch(0.62 0.19 25) 65%, transparent)",
            }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          {weaponBonus > 0 ? (
            <span className="rune-chip" style={{ color: "var(--boss-accent)" }}>
              <Swords className="h-3 w-3" /> +{weaponBonus} DMG
            </span>
          ) : (
            <span />
          )}
          {armorBonus > 0 ? (
            <span className="rune-chip text-primary">
              <Shield className="h-3 w-3" /> {t("boss.armorBlocks", "Blocks {{amount}} dmg", { amount: armorBonus })}
            </span>
          ) : null}
        </div>
      </RunePanel>

      {!defeated && (
        <>
          <p className="mx-auto mt-6 max-w-xs text-center text-xs text-muted-foreground">
            {t(
              "boss.instructions",
              "Every trial you conquer strikes this foe. Choose your attack.",
            )}
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
                      <h3 className="font-display text-base font-bold tracking-[0.05em]">
                        {tt.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="flex" aria-label={`Difficulty ${trial.difficulty} of 5`}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "h-3.5 w-3.5",
                                i < trial.difficulty
                                  ? "fill-primary text-primary"
                                  : "text-muted-foreground/40",
                              )}
                            />
                          ))}
                        </span>
                        <span className="rune-chip">
                          <Clock className="h-3 w-3" /> {trial.minutes} {t("trials.minutes", "min")}
                        </span>
                        <span className="rune-chip" style={{ color: "var(--boss-accent)" }}>
                          <Skull className="h-3 w-3" /> -{trial.xp + weaponBonus} HP
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
                          <div className="relative">
                            <button
                              onClick={() => {
                                fireStrikeEffects(trial.id);
                                void handleAttack(trial);
                              }}
                              className={cn(
                                "flex w-full items-center justify-center gap-2 rounded-md border py-2.5 transition active:scale-[0.97]",
                                pressedId === trial.id && "strike-pressed",
                              )}
                              style={{
                                borderColor:
                                  "color-mix(in oklab, var(--boss-accent) 45%, transparent)",
                                background:
                                  "color-mix(in oklab, var(--boss-accent) 12%, transparent)",
                              }}
                            >
                              <Skull className="h-4 w-4" style={{ color: "var(--boss-accent)" }} />
                              <span
                                className="font-display text-[0.7rem] font-bold uppercase tracking-[0.18em]"
                                style={{ color: "var(--boss-accent)" }}
                              >
                                {t("boss.strike", "Strike the Beast")}
                              </span>
                            </button>
                            {/* Spark burst on press — offsets driven by CSS vars */}
                            {sparks
                              .filter((s) => s.trialId === trial.id)
                              .map((s) => (
                                <span
                                  key={s.id}
                                  aria-hidden
                                  className="spark-particle pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
                                  style={{
                                    "--sx": `${s.dx}px`,
                                    "--sy": `${s.dy}px`,
                                    animationDelay: `${s.delay}ms`,
                                    background: "var(--boss-accent)",
                                    boxShadow:
                                      "0 0 6px 1px color-mix(in oklab, var(--boss-accent) 70%, transparent)",
                                  } as CSSProperties}
                                />
                              ))}
                          </div>
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
            <span
              className="burst-ring absolute h-40 w-40 rounded-full border-2 border-primary"
              style={{ animationDelay: "0.4s" }}
            />
            <span
              className="burst-ring absolute h-40 w-40 rounded-full border-2 border-primary"
              style={{ animationDelay: "0.8s" }}
            />
          </div>

          <div className="relative max-w-sm rounded-2xl border-2 border-primary bg-card p-6 text-center shadow-[0_0_60px_-10px_var(--primary)]">
            <p className="font-display text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
              {t("boss.slain", "Slain")}
            </p>
            <h2 className="text-glow-gold font-display mt-2 text-2xl font-black text-primary">
              {boss.name}
            </h2>
            <button
              onClick={() => {
                // Show interstitial at natural transition (fire-and-forget)
                void showInterstitialAd();
                setJustDefeated(false);
              }}
              className="btn-gold mt-5 !w-auto px-8"
            >
              {t("boss.claim", "Claim Victory")}
            </button>
          </div>
        </div>
      )}

      {/* Defeat — the boss struck you down first. No reward from defeat; rise and try again. */}
      {fallen && !defeated && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6">
          <div className="relative max-w-sm rounded-2xl border-2 border-red-500/60 bg-card p-6 text-center shadow-[0_0_60px_-12px_color-mix(in_oklab,oklch(0.62_0.19_25)_70%,transparent)]">
            <HeartCrack className="mx-auto h-10 w-10 text-red-400" />
            <p className="font-display mt-3 text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
              {t("boss.fallenTag", "The battle turns")}
            </p>
            <h2 className="font-display mt-1 text-2xl font-black text-red-400">
              {t("boss.fallen", "The hero falls")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                "boss.fallenDesc",
                "Defeat claims no reward. The foe keeps its wounds — rise and strike again.",
              )}
            </p>
            <button
              onClick={riseAgain}
              className="btn-gold mt-5 inline-flex !w-auto items-center gap-2 px-8"
            >
              <RotateCcw className="h-4 w-4" />
              {t("boss.retry", "Rise Again")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
