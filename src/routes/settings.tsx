import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Volume2, VolumeX, Languages } from "lucide-react";
import { RealmScreen } from "@/components/RealmScreen";
import { CharacterWelcome } from "@/components/FantasyCharacter";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { useSound, toggleMuted, setVolume } from "@/lib/sound-store";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import hallOfLegends from "@/assets/hall-of-legends.jpg";
import { cn } from "@/lib/utils";
import { FriendsPanel } from "@/components/FriendsPanel";
import { Link } from "@tanstack/react-router";
import { HealthSyncInfo } from "@/components/HealthSyncInfo";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "ja", label: "日本語" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
];

function SettingsPage() {
  const { t } = useTranslation();
  const { muted, volume } = useSound();
  const [, forceUpdate] = useState(0);
  const currentLang = i18n.language?.split("-")[0] ?? "en";

  function changeLang(code: string) {
    i18n.changeLanguage(code).then(() => {
      forceUpdate((n) => n + 1);
    });
  }

  return (
    <RealmScreen
      image={hallOfLegends}
      alt="A quiet chamber of runes and scrolls"
      imagePosition="center 25%"
    >
      <header className="pt-10 text-center">
        <RuneHeading>{t("settings.title", "Settings")}</RuneHeading>
      </header>

      <CharacterWelcome kind="maid" dialogue={t("characters.welcome.maid")} />
      <div className="mt-6 space-y-3">
        <RunePanel className="flex items-center gap-4">
          {muted ? (
            <VolumeX className="h-6 w-6 shrink-0" />
          ) : (
            <Volume2 className="h-6 w-6 shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-semibold">{t("settings.soundEffects", "Sound Effects")}</p>
            <input
              type="range"
              min={0}
              max={100}
              value={volume * 100}
              disabled={muted}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="mt-2 w-full"
            />
          </div>
          <button
            type="button"
            onClick={toggleMuted}
            className="rounded-full border-2 px-3 py-1 text-xs"
          >
            {muted ? t("settings.unmute", "Unmute") : t("settings.mute", "Mute")}
          </button>
        </RunePanel>

        <RunePanel className="flex items-center gap-4">
          <Languages className="h-6 w-6 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{t("settings.language", "Language")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  type="button"
                  key={l.code}
                  onClick={() => changeLang(l.code)}
                  className={cn(
                    "rounded-full border-2 px-3 py-1 text-xs transition-all duration-200",
                    currentLang === l.code
                      ? "border-primary bg-primary/15 font-bold text-primary shadow-[0_0_12px_color-mix(in_oklab,var(--primary)_30%,transparent)]"
                      : "border-border text-muted-foreground hover:border-primary/50",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </RunePanel>
      </div>
      <FriendsPanel />
      <HealthSyncInfo />
      <nav className="mt-5 flex justify-center gap-4 text-sm" aria-label={t("legal.navigation", "Legal navigation")}>
        <Link to="/privacy" className="text-primary underline underline-offset-4">{t("legal.privacyLink", "Privacy Policy")}</Link>
        <Link to="/terms" className="text-primary underline underline-offset-4">{t("legal.termsLink", "Terms of Service")}</Link>
      </nav>
    </RealmScreen>
  );
}
