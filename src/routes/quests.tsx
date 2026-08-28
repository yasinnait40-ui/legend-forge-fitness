import { createFileRoute } from "@tanstack/react-router";
import {
  Apple,
  Check,
  Dumbbell,
  Footprints,
  ShieldCheck,
  Swords,
  TreePine,
  Wind,
} from "lucide-react";
import guildHall from "@/assets/guild-hall.jpg";
import { RealmScreen } from "@/components/RealmScreen";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { completeQuest, questsDoneToday, useGame } from "@/lib/game-store";
import { announceRewards } from "@/lib/rewards";
import { playSound } from "@/lib/sound-store";
import { QUESTS, STAT_LABELS, type Quest, type StatKey } from "@/lib/game-data";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/quests")({
  head: () => ({
    meta: [
      { title: "The Quest Board — Daily Quests | AETHORA" },
      {
        name: "description",
        content:
          "Ancient contracts pinned in the guild hall: daily fitness quests that grant Strength, Endurance, Agility, Vitality and Recovery XP.",
      },
      { property: "og:title", content: "The Quest Board — Daily Quests | AETHORA" },
      {
        property: "og:description",
        content: "Sealed at dawn, renewed at midnight. Complete quests to forge your legend.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuestsPage,
});

const QUEST_ICONS = {
  dumbbell: Dumbbell,
  footprints: Footprints,
  shield: ShieldCheck,
  tree: TreePine,
  wind: Wind,
  apple: Apple,
} as const;

function QuestsPage() {
  const { t } = useTranslation();
  const game = useGame();
  const questsDone = questsDoneToday(game);

  function handleComplete(q: Quest) {
    const result = completeQuest(q.id, q.xp, q.stats);
    if (result) {
      playSound(result.leveledUp ? "levelUp" : "questComplete");
      announceRewards(result, `${q.name} — sealed`);
    }
  }

  return (
    <RealmScreen
      image={guildHall}
      alt="A candlelit adventurers guild hall with a great wooden quest board"
      imagePosition="center 22%"
    >
      <header className="pt-10 text-center">
        <RuneHeading>{t("quests.guildHall", "The Guild Hall")}</RuneHeading>
        <h1 className="text-glow-gold font-display mt-3 text-3xl font-black tracking-[0.08em] text-primary">
          {t("quests.title", "The Quest Board")}
        </h1>
        <p className="mt-2 text-xs tracking-wide text-muted-foreground">
          {t("quests.subtitle", "New contracts are pinned at dawn. Sealed quests renew tomorrow.")}
        </p>
      </header>

      <div className="mt-6 space-y-4">
        {QUESTS.map((q) => {
          const isDone = questsDone.includes(q.id);
          const Icon = QUEST_ICONS[q.icon as keyof typeof QUEST_ICONS];
          return (
            <RunePanel key={q.id}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-background/60 shadow-[0_0_14px_color-mix(in_oklab,var(--primary)_18%,transparent)]">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm font-bold uppercase tracking-[0.12em]">
                    {q.name}
                  </h3>
                  <p className="mt-1 text-sm leading-snug text-muted-foreground">{q.description}</p>
                  {q.auto && <p className="mt-1 text-[0.7rem] italic text-accent">{q.auto}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rune-chip text-primary">+{q.xp} XP</span>
                    {Object.entries(q.stats).map(([k, v]) => (
                      <span
                        key={k}
                        className="rune-chip"
                        style={{ color: `var(--stat-${k})` }}
                      >
                        +{v} {STAT_LABELS[k as StatKey]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                {isDone ? (
                  <div className="flex items-center justify-center gap-2 rounded-md border border-primary/45 bg-primary/10 py-2.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="font-display text-[0.7rem] font-bold uppercase tracking-[0.22em] text-primary">
                      Sealed
                    </span>
                  </div>
                ) : q.auto ? (
                  <div className="flex items-center justify-center gap-2 rounded-md border border-border py-2.5 text-muted-foreground">
                    <Swords className="h-4 w-4" />
                    <span className="font-display text-[0.7rem] font-bold uppercase tracking-[0.18em]">
                      Conquer a trial to seal
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleComplete(q)}
                    className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 py-2.5 transition hover:bg-primary/20"
                  >
                    <span className="font-display text-[0.7rem] font-bold uppercase tracking-[0.18em] text-primary">
                      {t("quests.markComplete", "Mark Complete")}
                    </span>
                  </button>
                )}
              </div>
            </RunePanel>
          );
        })}
      </div>

      <p className="mt-6 text-center text-[0.68rem] italic tracking-wide text-muted-foreground">
        The board renews at midnight, traveler.
      </p>
    </RealmScreen>
  );
}
