import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, ScrollText, Sparkles, Swords } from "lucide-react";
import homeKingdom from "@/assets/home-kingdom.jpg";
import arcaneWarrior from "@/assets/arcane-warrior.jpg";
import { RealmScreen } from "@/components/RealmScreen";
import { MonetagBanner, MonetagRewardedButton } from "@/components/MonetagAds";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { StatBar } from "@/components/StatBar";
import { questsDoneToday, useGame } from "@/lib/game-store";
import { levelProgress, QUESTS, STAT_ORDER } from "@/lib/game-data";
import { useGameText } from "@/lib/game-i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aethora - Fantasy Fitness RPG & Workout Game" },
      {
        name: "description",
        content:
          "Turn your daily workouts, gym routines, and fitness journey into an epic fantasy RPG adventure. Level up your character stats, complete daily quests, and forge your legend with Aethora.",
      },
      {
        name: "keywords",
        content:
          "fitness rpg, workout game, gamified fitness, gym rpg, aethora, arcane warrior, fitness quest, level up fitness",
      },
      { name: "author", content: "Hakari" },
      { property: "og:title", content: "Aethora - Fantasy Fitness RPG & Workout Game" },
      {
        property: "og:description",
        content:
          "Turn your daily workouts into a fantasy RPG adventure. Level up your stats and complete quests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Aethora - Fantasy Fitness RPG & Workout Game" },
      {
        name: "twitter:description",
        content: "Turn your daily workouts into a fantasy RPG adventure.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();
  const g = useGameText();
  const game = useGame();
  const { level, intoLevel, needed, ratio } = levelProgress(game.xp);
  const doneCount = QUESTS.filter((q) => questsDoneToday(game).includes(q.id)).length;

  return (
    <RealmScreen
      image={homeKingdom}
      alt="A warrior on a cliff overlooking the moonlit magical kingdom of Aethora"
      imagePosition="center 30%"
      veil="soft"
      eager
    >
      <header className="pt-14 text-center">
        <p className="font-display text-[0.6rem] font-semibold uppercase tracking-[0.5em] text-primary/85">
          {t("home.realmOf")}
        </p>
        <h1 className="text-glow-gold font-display mt-2 text-[3.2rem] font-black leading-none tracking-[0.1em] text-primary">
          {t("home.title")}
        </h1>
        <p className="font-display mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.42em] text-foreground/90">
          {t("home.subtitle")}
        </p>
      </header>

      <div className="h-[26dvh]" aria-hidden="true" />

      <RunePanel>
        <div className="flex items-center gap-4">
          <img
            src={arcaneWarrior}
            alt="Your arcane warrior in rune-engraved armor"
            width={1024}
            height={1536}
            loading="lazy"
            className="h-20 w-20 shrink-0 rounded-full border-2 border-primary/60 object-cover object-[center_12%] shadow-[0_0_18px_rgb(0_0_0/0.6)]"
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold leading-tight">{t("home.heroName")}</p>
            <p className="mt-0.5 text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
              {g.title(level)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-[0.58rem] uppercase tracking-[0.28em] text-muted-foreground">
              {t("home.level")}
            </p>
            <p className="text-glow-gold font-display text-3xl font-black text-primary">{level}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="font-display text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
              {t("home.experience")}
            </span>
            <span className="font-display text-xs font-bold text-primary">
              {intoLevel} / {needed} XP
            </span>
          </div>
          <div className="bar-track !h-2.5">
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
        </div>
      </RunePanel>

      <RunePanel className="mt-4">
        <RuneHeading>{t("home.attributes")}</RuneHeading>
        <div className="mt-3 space-y-3">
          {STAT_ORDER.map((s) => (
            <StatBar key={s} stat={s} value={game.stats[s]} />
          ))}
        </div>
      </RunePanel>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <RunePanel className="text-center">
          <Flame
            className={cn(
              "mx-auto h-7 w-7",
              game.streak > 0
                ? "text-stat-strength drop-shadow-[0_0_10px_var(--stat-strength)]"
                : "text-muted-foreground",
            )}
          />
          <p className="font-display mt-1 text-2xl font-black">{game.streak}</p>
          <p className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
            {t("home.dayFlame")}
          </p>
        </RunePanel>
        <Link to="/quests" className="block">
          <RunePanel className="h-full text-center">
            <ScrollText className="mx-auto h-7 w-7 text-primary" />
            <p className="font-display mt-1 text-2xl font-black">
              {doneCount}
              <span className="text-sm text-muted-foreground">/{QUESTS.length}</span>
            </p>
            <p className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
              {t("home.dailyQuests")}
            </p>
          </RunePanel>
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        <Link to="/trials" className="block">
          <span className="btn-gold">
            <Swords className="h-4 w-4" /> {t("home.beginTrials")}
          </span>
        </Link>
        <Link to="/guide" className="block">
          <span className="btn-rune-ghost">
            <Sparkles className="h-4 w-4" /> {t("home.consultGuide")}
          </span>
        </Link>
      </div>

      <MonetagBanner />
      <MonetagRewardedButton />
    </RealmScreen>
  );
}
