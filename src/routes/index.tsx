import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Swords } from "lucide-react";
import homeKingdom from "@/assets/home-kingdom.webp";
import { RealmScreen } from "@/components/RealmScreen";
import { CharacterWelcome } from "@/components/FantasyCharacter";
import { TopHud } from "@/components/TopHud";
import { SideRail } from "@/components/SideRail";
import { EconomyPanels, type RailPanel } from "@/components/EconomyPanels";
import { FreeBoostButton } from "@/components/NativeAds";
import { TreasureChest } from "@/components/TreasureChest";
import { pullEconomy } from "@/lib/economy";
import { questsDoneToday, useGame } from "@/lib/game-store";
import { QUESTS } from "@/lib/game-data";
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
  const [panel, setPanel] = useState<RailPanel>(null);
  const [treasure, setTreasure] =
    useState<import("@/lib/game-store").AwardResult["treasure"]>(null);

  // Keep the server-owned wallet mirror fresh while the realm is open.
  useEffect(() => {
    if (!user) return;
    void pullEconomy();
  }, [user]);

  // The "current quest" card: first not-yet-done quest of today, else a call
  // to /quests. Pure display — completion itself stays on the quests screen.
  const doneToday = new Set(questsDoneToday(game));
  const currentQuest = QUESTS.find((q) => !doneToday.has(q.id)) ?? QUESTS[0]!;

  return (
    <RealmScreen
      image={homeKingdom}
      alt="A radiant fantasy kingdom under a golden sky, seen from a cliff above the clouds"
      imagePosition="center 30%"
      veil="soft"
      eager
    >
      {/* The mockup's top bar: avatar/level/XP · coins/gems with "+" · settings */}
      <TopHud onPanel={setPanel} />

      {/* REWARDS · MAIL · DAILY rail with live red-dot badges */}
      <SideRail signedIn={Boolean(user)} onPanel={setPanel} />

      {/* AETHORA — Forge Your Legend */}
      <header className="relative z-10 mt-6 text-center [text-shadow:0_2px_18px_rgb(0_0_0/0.85)]">
        <h1 className="text-glow-gold font-display text-[3.4rem] font-black leading-none tracking-[0.08em] text-primary">
          {t("home.title")}
        </h1>
        <p className="font-display mt-2 text-[0.66rem] font-semibold uppercase tracking-[0.5em] text-foreground/90">
          — {t("home.subtitle")} —
        </p>
      </header>

      {/* The King stands in the kingdom, lit from above, embers at his feet */}
      <div className="king-stage relative">
        <div className="king-stage-shade" aria-hidden="true" />
        <div className="king-stage-light" aria-hidden="true" />
        <div className="king-stage-motes" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <CharacterWelcome kind="king" />
        <div className="h-[16dvh]" aria-hidden="true" />
      </div>

      {/* CURRENT QUEST — the mockup's framed quest card */}
      <Link
        to="/quests"
        className="relative z-10 mt-2 block rounded-xl border border-primary/35 bg-background/75 p-4 shadow-[0_10px_36px_-14px_rgb(0_0_0/0.9)] backdrop-blur-md transition-colors hover:border-primary/60"
      >
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-primary" aria-hidden="true" />
          <p className="font-display text-[0.6rem] font-bold uppercase tracking-[0.3em] text-primary">
            {t("home.currentQuest", "Current quest")}
          </p>
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display truncate text-base font-bold text-foreground">
              {currentQuest.name}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {currentQuest.description}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-primary rtl:-scale-x-100" />
        </div>
      </Link>

      {/* START YOUR JOURNEY — the ornate gold CTA */}
      <div className="relative z-10 mt-5">
        <Link
          to="/trials"
          className="btn-gold block !py-4 text-center font-display text-sm font-black uppercase tracking-[0.3em]"
        >
          <Swords className="h-4 w-4" />
          {t("home.startJourney", "Start your journey")}
        </Link>
        <p className="mt-2 text-center text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
          {game.streak > 0
            ? t("home.streakAlive", "{{count}}-day flame burning", { count: game.streak })
            : t("home.streakCold", "The flame waits to be lit")}
        </p>
      </div>

      {!loading && !user && (
        <p className="relative z-10 mt-4 text-center text-xs text-muted-foreground">
          {t("home.signedOutHint", "Playing unbound — progress stays on this device.")}{" "}
          <Link to="/auth" className="text-primary underline-offset-4 hover:underline">
            {t("auth.signIn", "Sign in")}
          </Link>
        </p>
      )}

      {/* Ad-supported treasure boost (LevelPlay rewarded on Android) */}
      <div className="relative z-10 mt-4">
        <FreeBoostButton onReward={(r) => r && setTreasure(r)} />
        {treasure && <TreasureChest reward={treasure} onClose={() => setTreasure(null)} />}
      </div>

      <EconomyPanels panel={panel} onClose={() => setPanel(null)} signedIn={Boolean(user)} />
    </RealmScreen>
  );
}
