import { useState } from "react";
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
import { CharacterWelcome } from "@/components/FantasyCharacter";
import { TreasureChest } from "@/components/TreasureChest";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { completeQuest, questsDoneToday, useGame } from "@/lib/game-store";
import { announceRewards } from "@/lib/rewards";
import { playSound } from "@/lib/sound-store";
import { QUESTS, type Quest, type StatKey } from "@/lib/game-data";
import { useGameText } from "@/lib/game-i18n";
import { useTranslation } from "react-i18next";
import { requestReminderPermission } from "@/lib/notifications";

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

/* RPG quest lore — short flavor text for each quest */
const QUEST_LORE: Record<string, string> = {
  "trial-of-strength":
    "The eastern gate demands proof of iron will. The first road of the realm begins with thirty breaths of fire.",
  "path-of-endurance":
    "Beyond the village, the ancient road stretches three leagues into the mist. Walk it under the open sky.",
  "guardians-discipline":
    "The guardian seeks those who prove themselves in the arena. Only the disciplined may earn this seal.",
  "breath-of-the-forest":
    "The Silverpine Forest whispers of balance. Ten minutes among the trees restores what steel cannot.",
  "shadow-swiftness":
    "In the realm, speed is survival. The shadow dancers practice beneath the watchtower at dusk.",
  "feast-of-the-keep":
    "The keep's kitchens stock only what strengthens. A proper meal and two cups of water — the hero's fuel.",
};

function QuestsPage() {
  const { t } = useTranslation();
  const g = useGameText();
  const game = useGame();
  const questsDone = questsDoneToday(game);
  const [treasure, setTreasure] =
    useState<import("@/lib/game-store").AwardResult["treasure"]>(null);

  async function handleComplete(q: Quest) {
    const result = await completeQuest(q.id, q.xp, q.stats);
    if (result) {
      playSound(result.leveledUp ? "levelUp" : "questComplete");
      announceRewards(result, t("quests.sealedToast", { name: g.quest(q).name }));
      if (result.treasure) setTreasure(result.treasure);
      if (game.totalQuests + game.totalTrials === 1)
        requestReminderPermission(t("notifications.permissionPrompt"));
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

      <CharacterWelcome kind="adventurer" />
      <div className="mt-6 space-y-4 rpg-stagger-in">
        {QUESTS.map((q) => {
          const isDone = questsDone.includes(q.id);
          const Icon = QUEST_ICONS[q.icon as keyof typeof QUEST_ICONS];
          const qt = g.quest(q);
          const lore = QUEST_LORE[q.id];
          return (
            <RunePanel key={q.id} className={isDone ? "quest-sealed" : ""}>
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary/40 bg-background/60 shadow-[0_0_18px_color-mix(in_oklab,var(--primary)_22%,transparent)]">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[0.82rem] font-bold uppercase tracking-[0.12em]">
                    {qt.name}
                  </h3>
                  {lore && <p className="quest-lore">{lore}</p>}
                  {qt.auto && <p className="mt-1 text-[0.7rem] italic text-accent">{qt.auto}</p>}
                </div>
              </div>

              {/* Objective section */}
              <div className="mt-3 rounded-md border border-border/60 bg-background/55 px-3 py-2">
                <p className="font-display text-[0.58rem] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  {t("quests.objective", "Objective")}
                </p>
                <p className="mt-1 text-sm leading-snug text-foreground">{qt.description}</p>
              </div>

              {/* Rewards */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="quest-reward-badge">+{q.xp} XP</span>
                {Object.entries(q.stats).map(([k, v]) => (
                  <span
                    key={k}
                    className="quest-reward-badge"
                    style={{
                      color: `var(--stat-${k})`,
                      borderColor: `color-mix(in oklab, var(--stat-${k}) 40%, transparent)`,
                      background: `color-mix(in oklab, var(--stat-${k}) 8%, transparent)`,
                    }}
                  >
                    +{v} {g.stat(k as StatKey)}
                  </span>
                ))}
              </div>
              <div className="mt-3">
                {isDone ? (
                  <div className="flex items-center justify-center gap-2 rounded-md border border-primary/45 bg-primary/10 py-2.5">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="font-display text-[0.7rem] font-bold uppercase tracking-[0.22em] text-primary">
                      {t("quests.sealed", "Sealed")}
                    </span>
                  </div>
                ) : q.auto ? (
                  <div className="flex items-center justify-center gap-2 rounded-md border border-border py-2.5 text-muted-foreground">
                    <Swords className="h-4 w-4" />
                    <span className="font-display text-[0.7rem] font-bold uppercase tracking-[0.18em]">
                      {t("quests.conquerToSeal", "Conquer a trial to seal")}
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
        {t("quests.renewNote", "The board renews at midnight, traveler.")}
      </p>
      {treasure && <TreasureChest reward={treasure} onClose={() => setTreasure(null)} />}
    </RealmScreen>
  );
}
