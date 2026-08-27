// src/routes/settings.tsx
import { createFileRoute } from "@tanstack/react-router";
import { Volume2, VolumeX, Languages } from "lucide-react";
import { RealmScreen } from "@/components/RealmScreen";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { useSound, toggleMuted, setVolume } from "@/lib/sound-store";
import { useTranslation } from "react-i18next";
import hallOfLegends from "@/assets/hall-of-legends.jpg";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings | AETHORA" },
      { name: "description", content: "Adjust sound, language and preferences for your Aethora journey." },
      { property: "og:title", content: "Settings | AETHORA" },
      { property: "og:type", content: "website" },
    ],
  }),
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
  const { t, i18n } = useTranslation();
  const { muted, volume } = useSound();

  return (
    <RealmScreen image={hallOfLegends} alt="A quiet chamber of runes and scrolls" imagePosition="center 25%">
      <header className="pt-10 text-center">
        <RuneHeading>{t("settings.title", "Settings")}</RuneHeading>
        <h1 className="text-glow-gold font-display mt-3 text-3xl font-black tracking-[0.08em] text-center">
          Preferences
        </h1>
      </header>

      <div className="mt-6 space-y-3">
        <RunePanel className="flex items-center gap-4">
          {muted ? <VolumeX className="h-6 w-6 shrink-0" /> : <Volume2 className="h-6 w-6 shrink-0" />}
          <div className="flex-1">
            <p className="font-semibold">{t("settings.soundEffects", "Sound Effects")}</p>
            <input
              type="range"
              min={0}
              max={100}
              value={volume * 100}
              disabled={muted}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="w-full mt-2"
            />
          </div>
          <button onClick={toggleMuted} className="text-xs px-3 py-1 rounded-full border-2">
            {muted ? "Unmute" : "Mute"}
          </button>
        </RunePanel>

        <RunePanel className="flex items-center gap-4">
          <Languages className="h-6 w-6 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{t("settings.language", "Language")}</p>
            <div className="flex gap-2 mt-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => i18n.changeLanguage(l.code)}
                  className={`text-xs px-3 py-1 rounded-full border-2 ${
                    i18n.language === l.code ? "opacity-100" : "opacity-55"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </RunePanel>
      </div>
    </RealmScreen>
  );
}
