import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronDown, Clock, Star } from "lucide-react";
import trainingArena from "@/assets/training-arena.jpg";
import { RealmScreen } from "@/components/RealmScreen";
import { CharacterWelcome } from "@/components/FantasyCharacter";
import { TreasureChest } from "@/components/TreasureChest";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { completeTrial, trialsDoneToday, useGame } from "@/lib/game-store";
import { announceRewards } from "@/lib/rewards";
import { playSound } from "@/lib/sound-store";
import { TRIALS, type StatKey, type Trial } from "@/lib/game-data";
import { useGameText } from "@/lib/game-i18n";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { requestReminderPermission } from "@/lib/notifications";

export const Route = createFileRoute("/trials")({
  head: () => ({
    meta: [
      { title: "Training Trials — Workouts of the Arena | AETHORA" },
      {
        name: "description",
        content:
          "Conquer fantasy training trials in the rune-lit arena: chest, core, legs, running and mobility workouts with clear sets and reps — each grants XP.",
      },
      { property: "og:title", content: "Training Trials — Workouts of the Arena | AETHORA" },
      {
        property: "og:description",
        content: "Every workout is a trial. Every conquered trial grants XP and strength.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrialsPage,
});

function TrialsPage() {
  const { t } = useTranslation();
  const g = useGameText();
  const game = useGame();
  const done = trialsDoneToday(game);
  const [openId, setOpenId] = useState<string | null>(TRIALS[0]?.id ?? null);
  const [treasure, setTreasure] =
    useState<import("@/lib/game-store").AwardResult["treasure"]>(null);

  function handleComplete(trial: Trial) {
    const result = completeTrial(trial.id, trial.name, trial.xp, trial.stats);
    if (result) {
      playSound(result.leveledUp ? "levelUp" : "questComplete");
      announceRewards(result, t("trials.conqueredToast", { name: g.trial(trial).name }));
      if (result.treasure) setTreasure(result.treasure);
      if (game.totalQuests + game.totalTrials === 1)
        requestReminderPermission(t("notifications.permissionPrompt"));
    }
  }

  return (
    <RealmScreen
      image={trainingArena}
      alt="An ancient underground training arena with a glowing rune circle"
      imagePosition="center 30%"
    >
      <header className="pt-10 text-center">
        <RuneHeading>{t("trials.trainingGrounds", "The Training Grounds")}</RuneHeading>
        <h1 className="text-glow-gold font-display mt-3 text-3xl font-black tracking-[0.08em] text-primary">
          {t("trials.title", "Trials of the Arena")}
        </h1>
        <p className="mt-2 text-xs tracking-wide text-muted-foreground">
          {t(
            "trials.subtitle",
            "Step into the rune circle. Each trial lists its rites — complete them all.",
          )}
        </p>
      </header>

      <CharacterWelcome kind="scientist" dialogue={t("characters.welcome.scientist")} />
      <div className="mt-6 space-y-4">
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
                  <p className="mt-0.5 text-xs italic text-muted-foreground">{tt.epithet}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="flex" aria-label={`Difficulty ${trial.difficulty} of 5`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-3.5 w-3.5",
                            i < trial.difficulty
                              ? "fill-primary text-primary drop-shadow-[0_0_6px_var(--primary)]"
                              : "text-muted-foreground/40",
                          )}
                        />
                      ))}
                    </span>
                    <span className="rune-chip">
                      <Clock className="h-3 w-3" /> {trial.minutes} {t("trials.minutes", "min")}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "mt-1 h-5 w-5 shrink-0 text-primary transition-transform duration-300",
                    open && "rotate-180",
                  )}
                />
              </button>

              {open && (
                <div className="mt-3 border-t border-primary/15 pt-3">
                  <p className="font-display mb-2 text-[0.62rem] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                    {t("trials.rites", "Rites of the Trial")}
                  </p>
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
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rune-chip text-primary">+{trial.xp} XP</span>
                    {Object.entries(trial.stats).map(([k, v]) => (
                      <span key={k} className="rune-chip" style={{ color: `var(--stat-${k})` }}>
                        +{v} {g.stat(k as StatKey)}
                      </span>
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
                        onClick={() => handleComplete(trial)}
                        className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 py-2.5 transition hover:bg-primary/20"
                      >
                        <span className="font-display text-[0.7rem] font-bold uppercase tracking-[0.18em] text-primary">
                          {t("trials.completeTrial", "Complete Trial")}
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
      {treasure && <TreasureChest reward={treasure} onClose={() => setTreasure(null)} />}
    </RealmScreen>
  );
}
