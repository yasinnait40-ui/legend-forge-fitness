import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, LogIn, ScrollText, Sparkles, Swords } from "lucide-react";
import homeKingdom from "@/assets/home-kingdom.jpg";
import { RealmScreen } from "@/components/RealmScreen";
import { CharacterWelcome } from "@/components/FantasyCharacter";
import { MonetagBanner, MonetagRewardedButton } from "@/components/MonetagAds";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { StatBar } from "@/components/StatBar";
import { questsDoneToday, todayKey, useGame } from "@/lib/game-store";
import { QUESTS, STAT_ORDER } from "@/lib/game-data";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

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
  const game = useGame();
  const { user, loading } = useAuth();
  const doneCount = QUESTS.filter((q) => questsDoneToday(game).includes(q.id)).length;
  const yesterday = todayKey(new Date(Date.now() - 86400000));
  const streakInterrupted = Boolean(
    game.lastActiveDate && game.lastActiveDate !== todayKey() && game.lastActiveDate !== yesterday,
  );

  return (
    <RealmScreen
      image={homeKingdom}
      alt="A warrior on a cliff overlooking the moonlit magical kingdom of Aethora"
      imagePosition="center 30%"
      veil="soft"
      eager
    >
      <header className="pt-14 text-center">
        {!loading && !user && (
          <Link to="/auth" className="btn-rune-ghost mx-auto mb-6 !w-auto px-5 py-2 text-[0.65rem]">
            <LogIn className="h-4 w-4" /> Sign In / Create Account
          </Link>
        )}
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

      <CharacterWelcome kind="king" />
      <div className="h-[26dvh]" aria-hidden="true" />

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
          <p className="mt-2 text-[0.58rem] text-muted-foreground">
            {t("home.longestStreak", { count: game.bestStreak })}
          </p>
          {streakInterrupted && (
            <p className="mt-1 text-[0.58rem] italic text-accent">{t("home.streakRestart")}</p>
          )}
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
