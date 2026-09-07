import { useState, useCallback, useEffect, useRef } from "react";
import { Check, Gift, Pause, Sparkles, X } from "lucide-react";
import { RealmScreen } from "@/components/RealmScreen";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import type { AwardResult, TreasureReward } from "@/lib/game-store";
import { completeTrial, useGame } from "@/lib/game-store";
import { playSound } from "@/lib/sound-store";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { Trial, TrialGuardian } from "@/lib/game-data";

type BattleState = "enter" | "active" | "victory" | "closed";

/**
 * TrialBattle — a lightweight RPG encounter wrapper around the existing trial
 * completion flow.
 *
 * One "turn" = one confirmed exercise segment. There is no separate mini-game;
 * the real workout is the attack. Completing the full trial triggers the same
 * completeTrial reward flow as the existing simple completion button.
 *
 * This component is optional and presentational only: it is mounted behind the
 * existing trial-expansion button so the simple flow still works unblocked.
 */
interface TrialBattleProps {
  trial: Trial;
  guardian: TrialGuardian;
  onExit: () => void;
}

export function TrialBattle({ trial, guardian, onExit }: TrialBattleProps) {
  const { t } = useTranslation();
  const game = useGame();
  const [state, setState] = useState<BattleState>("enter");
  const [index, setIndex] = useState(0);
  const [resolve, setResolve] = useState(100);
  const [flavor, setFlavor] = useState("");
  const [strikeNow, setStrikeNow] = useState(false);
  const [treasure, setTreasure] = useState<TreasureReward | null>(null);
  const lastPlayed = useRef(0);
  const lastHitAt = useRef(0);

  const maxTurns = trial.exercises.length;
  const hitPerTurn = Math.max(8, Math.round(100 / maxTurns));

  useEffect(() => {
    if (state !== "enter") return;
    const enterToActive = setInterval(() => {
      setState("active");
      clearInterval(enterToActive);
    }, 1400);
    return () => {
      clearInterval(enterToActive);
    };
  }, [state]);

  const play = useCallback((key: "battleHit" | "battleVictory") => {
    const now = performance.now();
    if (now - lastPlayed.current < 80) return;
    lastPlayed.current = now;
    setStrikeNow(key === "battleHit");
    playSound(key);
  }, []);

  const confirmTurn = useCallback(() => {
    if (state !== "active") return;
    if (index >= maxTurns) return;

    const now = performance.now();
    if (now - lastHitAt.current < 280) return;
    lastHitAt.current = now;

    setStrikeNow(true);
    play("battleHit");

    const done = index + 1;
    setIndex(done);
    setResolve((r) => Math.max(0, r - hitPerTurn));
    setFlavor(t("trials.battleStrike", { part: trial.exercises[index]?.name }));

    if (done >= maxTurns) {
      setState("victory");
      play("battleVictory");
      setFlavor(t("trials.battleVictory"));
    }
  }, [state, index, maxTurns, hitPerTurn, trial.exercises, t, play]);

  /*
   * Victory screen automatically continues into the real reward flow.
   */
  useEffect(() => {
    if (state !== "victory") return;
    const t0 = setTimeout(() => {
      setStrikeNow(false);
      setResolve(0);
      // Auto-advance into the final completeTrial call.
      completeTrial(trial.id, trial.name, trial.xp, trial.stats).then((result) => {
        if (result) {
          playSound(result.leveledUp ? "levelUp" : "questComplete");
          if (result.treasure) {
            setTreasure(result.treasure);
          }
        }
        setState("closed");
      });
    }, 1400);
    return () => clearTimeout(t0);
  }, [state, trial, playSound]);

  const themeClass =
    {
      iron: "guardian-theme-iron",
      ember: "guardian-theme-ember",
      storm: "guardian-theme-storm",
      shadow: "guardian-theme-shadow",
      mist: "guardian-theme-mist",
      frost: "guardian-theme-frost",
      arcane: "guardian-theme-arcane",
      stone: "guardian-theme-stone",
    }[guardian.element] ?? "guardian-theme-stone";

  return (
    <>
      <RealmScreen
        image={trainingArenaFallback()}
        alt={t("trials.battlePlayer")}
        imagePosition="center 30%"
        veil="soft"
      >
        {state !== "closed" && (
          <div className="mx-auto mt-6 max-w-lg">
            <RunePanel className="border-accent/20 bg-card/40 shadow-[0_0_24px_color-mix(in_oklab,var(--accent)_25%,transparent)]">
              <RuneHeading>{t("trials.battlePlayer")}</RuneHeading>

              {/* Player side */}
              <div className="player-side">
                <span className="font-display text-lg font-bold tracking-wide text-primary">
                  {t("trials.battlePlayer")}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {game.xp.toLocaleString()} XP
                </span>
                <div className="player-token" aria-hidden="true" />
              </div>

              {/* Center divide */}
              <div className="verse-divider" aria-hidden="true">
                <span className="verse-mark" />
              </div>

              {/* Enemy side */}
              <div className={cn("enemy-side", themeClass)}>
                <span className="font-display text-lg font-bold tracking-wide text-accent">
                  {guardian.name}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {t("trials.battleEnemy")}
                </span>
                <div className="enemy-token" aria-hidden="true" data-element={guardian.element} />
              </div>

              {/* Resolve bar */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("trials.battleEnemyResolve")}</span>
                  <span
                    className="font-display font-bold"
                    style={{
                      color:
                        resolve > 50
                          ? "var(--accent)"
                          : resolve > 20
                            ? "var(--primary)"
                            : "var(--stat-strength)",
                    }}
                  >
                    {resolve}%
                  </span>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-md bg-secondary/70 border border-border/60">
                  <div
                    className="h-full w-full rounded-md bg-gradient-to-r from-secondary via-accent to-primary transition-[width] duration-300"
                    style={{ width: `${resolve}%` }}
                    role="progressbar"
                    aria-valuenow={resolve}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <p className="mt-1.5 text-[0.66rem] tracking-wide text-muted-foreground">
                  {resolve > 50
                    ? t("trials.battleResolveFull")
                    : resolve > 20
                      ? t("trials.battleEnemyResolve")
                      : t("trials.battleResolveDepleted")}
                </p>
              </div>

              {/* Brief + turn flow */}
              {state === "enter" && (
                <div className="mt-4 border-t border-border/40 pt-3">
                  <p className="font-display text-[0.62rem] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                    {t("trials.battleTip")}
                  </p>
                  <p className="mt-2 text-xs italic leading-relaxed text-foreground/80">
                    {t("trials.battleFlavor")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setState("active")}
                    className="mt-3 btn-gold w-full"
                  >
                    {t("trials.battleConfirm")}
                  </button>
                </div>
              )}

              {state === "active" && (
                <div className="mt-4 border-t border-border/40 pt-3 space-y-2">
                  {index < maxTurns && (
                    <>
                      <p className="font-display text-[0.62rem] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                        {t("trials.battleAttack")}
                      </p>
                      <div className="space-y-1">
                        {trial.exercises.map((ex, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex items-center justify-between gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-2 text-sm",
                              i < index ? "opacity-50" : "border-accent/20",
                            )}
                          >
                            <span className="flex items-center gap-2">
                              {i < index ? (
                                <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                              ) : i === index ? (
                                <span className="text-accent">✦</span>
                              ) : (
                                <span className="text-muted-foreground/60">○</span>
                              )}
                              <span className="text-foreground/90">{ex.name}</span>
                            </span>
                            <span className="font-display text-xs font-bold text-muted-foreground">
                              {ex.sets}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={confirmTurn}
                          disabled={index >= maxTurns}
                          className="flex-1 rounded-md border border-primary/40 bg-primary/10 py-2.5 text-center text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t("trials.battleConfirmTurn")}
                        </button>
                        <button
                          type="button"
                          onClick={onExit}
                          className="rounded-md border border-border/60 bg-background/60 py-2 px-3 text-[0.62rem] text-muted-foreground transition hover:bg-background/80"
                          aria-label={t("trials.battleCancel")}
                        >
                          {t("trials.battleCancel")}
                        </button>
                      </div>
                    </>
                  )}
                  {index >= maxTurns && (
                    <div className="flex items-center gap-2 rounded-md border border-primary/45 bg-primary/10 py-2.5">
                      <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                      <span className="font-display text-[0.7rem] font-bold uppercase tracking-[0.22em] text-primary">
                        {t("trials.battleConfirmAll")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {state === "victory" && (
                <div className="mt-4 border-t border-accent/30 pt-3 text-center">
                  <div className="mx-auto my-4 h-16 w-16 rounded-full bg-accent/15 flex items-center justify-center">
                    <Check className="h-8 w-8 text-accent" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-xl font-bold uppercase tracking-[0.15em] text-primary">
                    {t("trials.battleVictory")}
                  </h3>
                  <p className="mt-2 text-sm italic text-foreground/80 leading-relaxed">
                    {t("trials.battleVictoryFlavor")}
                  </p>
                </div>
              )}
            </RunePanel>

            {/* Strike effect */}
            {strikeNow && flavor && (
              <div
                className="pointer-events-none mt-4 text-center text-sm font-semibold text-accent"
                aria-live="polite"
              >
                {flavor}
              </div>
            )}
          </div>
        )}
      </RealmScreen>

      {/* Treasure chest, if the victory opened one */}
      {treasure && <TravelTreasureChest reward={treasure} onClose={() => setTreasure(null)} />}
    </>
  );
}

function trainingArenaFallback(): string {
  try {
    return new URL("/assets/training-arena.png", window.location.href).href;
  } catch {
    return "";
  }
}

function TravelTreasureChest({ reward, onClose }: { reward: TreasureReward; onClose: () => void }) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);

  return (
    <div
      className="chest-overlay fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t("treasure.title")}
    >
      <div className="chest-card relative w-full max-w-sm overflow-hidden rounded-xl border border-primary/60 bg-card p-6 text-center shadow-[0_0_40px_color-mix(in_oklab,var(--primary)_30%,transparent)]">
        {!opened ? (
          <>
            <Gift
              className="chest-sealed-icon mx-auto mb-3 h-16 w-16 text-primary"
              aria-hidden="true"
            />
            <h2 className="font-display text-xl font-bold uppercase tracking-[0.15em] text-primary">
              {t("treasure.title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("treasure.invitation")}</p>
            <button onClick={() => setOpened(true)} className="btn-gold mt-5">
              {t("treasure.open")}
            </button>
          </>
        ) : (
          <>
            {/* Rotating god-rays behind the revealed reward. */}
            <div className="chest-rays" aria-hidden="true" />
            <div className="chest-reveal relative">
              <Sparkles
                className="mx-auto mb-3 h-12 w-12 text-primary drop-shadow-[0_0_14px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
                aria-hidden="true"
              />
              <h2 className="font-display text-xl font-bold uppercase tracking-[0.15em] text-primary">
                {t("treasure.revealed")}
              </h2>
            </div>
            <p className="chest-reveal-text relative mt-4 text-lg font-semibold text-foreground">
              {reward.type === "xp"
                ? t("treasure.xp", { amount: reward.amount })
                : t("treasure.cosmetic")}
            </p>
            <button onClick={onClose} className="btn-rune-ghost chest-reveal-text relative mt-5">
              {t("treasure.claim")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
