import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";
import { RealmScreen } from "@/components/RealmScreen";
import { FantasyCharacter } from "@/components/FantasyCharacter";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { useGame } from "@/lib/game-store";
import { levelFromXp } from "@/lib/game-data";
import sacredCompanions from "@/assets/guild-hall.jpg";

export const Route = createFileRoute("/legend")({
  head: () => ({
    meta: [
      { title: "Sacred Companions — AETHORA" },
      { name: "description", content: "Hakari and Miri walk beside you in Aethora." },
    ],
  }),
  component: LegendPage,
});

function LegendPage() {
  const { t } = useTranslation();
  const game = useGame();
  const level = levelFromXp(game.xp);

  return (
    <RealmScreen
      image={sacredCompanions}
      alt="A peaceful chamber where two sacred companions rest"
      imagePosition="center 35%"
      veil="soft"
      eager
    >
      <header className="pt-10 text-center">
        <RuneHeading>{t("characters.companionsTitle")}</RuneHeading>
        <h1 className="text-glow-gold font-display mt-3 text-3xl font-black tracking-[0.08em] text-primary">
          {t("characters.companionsDesc")}
        </h1>
        <p className="mt-2 text-xs tracking-wide text-muted-foreground">
          Level {level} — the companions recognize your flame.
        </p>
      </header>

      <div className="companions-container mt-4">
        <div className="companion-column">
          <FantasyCharacter kind="hakari" />
        </div>
        <div className="companion-column">
          <FantasyCharacter kind="miri" />
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        <RunePanel className="text-center">
          <Sparkles className="mx-auto h-6 w-6 text-accent" aria-hidden="true" />
          <p className="mt-2 text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
            {t("characters.companionsDesc")}
          </p>
        </RunePanel>
      </div>

      <p className="mt-6 text-center text-[0.66rem] italic tracking-wide text-muted-foreground">
        {t("home.renewNote")}
      </p>
    </RealmScreen>
  );
}
