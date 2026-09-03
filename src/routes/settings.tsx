import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LogIn, LogOut, UserPlus, Volume2, VolumeX, Languages } from "lucide-react";
import { RealmScreen } from "@/components/RealmScreen";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { useSound, toggleMuted, setVolume } from "@/lib/sound-store";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import warriorChamber from "@/assets/warrior-chamber.jpg";
import { cn } from "@/lib/utils";
import { FriendsPanel } from "@/components/FriendsPanel";
import { Link } from "@tanstack/react-router";
import { HealthSyncInfo } from "@/components/HealthSyncInfo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

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
  const { user, loading } = useAuth();
  const [, forceUpdate] = useState(0);
  const currentLang = i18n.language?.split("-")[0] ?? "en";

  function changeLang(code: string) {
    i18n.changeLanguage(code).then(() => {
      forceUpdate((n) => n + 1);
    });
  }

  return (
    <RealmScreen
      image={warriorChamber}
      alt="A peaceful fantasy bedroom chamber with golden ornaments"
      imagePosition="center 40%"
      veil="normal"
    >
      <header className="pt-10 text-center">
        <RuneHeading>{t("settings.title", "Settings")}</RuneHeading>
      </header>

      {/* Maid Character Section */}
      <div className="mt-8 flex flex-col items-center gap-4">
        <div className="relative h-64 w-full max-w-xs">
          {/* Maid Character Placeholder - Gold border frame */}
          <div className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-yellow-600/60 bg-gradient-to-b from-yellow-900/20 to-black/40 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-center">
              <img src="/characters/Maid.png" ... />
              <p className="font-display text-xs uppercase tracking-widest text-yellow-600">The Maid</p>
              <p className="font-serif text-xs italic text-foreground/70">Chamber Steward</p>
            </div>
          </div>
        </div>

        {/* Maid Dialogue Box */}
        <div className="w-full max-w-sm rounded-lg border-2 border-yellow-600/60 bg-gradient-to-b from-black/80 to-black/60 p-4 backdrop-blur-sm">
          <p className="font-display text-[0.65rem] uppercase tracking-widest text-yellow-600">
            The Maid
          </p>
          <p className="font-serif text-sm leading-6 text-foreground">
            Your chamber is ready, my lord. The realm awaits your commands.
          </p>
          <div className="mt-3 flex justify-end">
            <div className="h-2 w-2 rotate-45 border-b-2 border-r-2 border-yellow-600/60" />
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <RunePanel className="flex items-start gap-4">
          {user ? (
            <LogIn className="mt-1 h-6 w-6 shrink-0" />
          ) : (
            <UserPlus className="mt-1 h-6 w-6 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t("settings.account", "Account")}</p>
            {loading ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {t("settings.accountLoading", "Reading your oath...")}
              </p>
            ) : user ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("settings.signedIn", "Signed in")}
                </p>
                <p
                  className="mt-1 truncate text-sm text-foreground/80"
                  title={user.email ?? undefined}
                >
                  {user.email}
                </p>
                <button
                  type="button"
                  onClick={() => void supabase.auth.signOut()}
                  className="btn-rune-ghost mt-3 !w-auto px-4 py-2 text-[0.65rem]"
                >
                  <LogOut className="h-4 w-4" /> {t("settings.logOut", "Log Out")}
                </button>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {t(
                    "settings.accountDescription",
                    "Sign in to save your progress, quests, achievements, inventory, and character data.",
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to="/auth" className="btn-rune !w-auto px-4 py-2 text-[0.65rem]">
                    <LogIn className="h-4 w-4" /> {t("settings.signIn", "Sign In")}
                  </Link>
                  <Link to="/auth" className="btn-rune-ghost !w-auto px-4 py-2 text-[0.65rem]">
                    <UserPlus className="h-4 w-4" /> {t("settings.createAccount", "Create Account")}
                  </Link>
                </div>
              </>
            )}
          </div>
        </RunePanel>

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
      <nav
        className="mt-5 flex justify-center gap-4 text-sm"
        aria-label={t("legal.navigation", "Legal navigation")}
      >
        <Link to="/privacy" className="text-primary underline underline-offset-4">
          {t("legal.privacyLink", "Privacy Policy")}
        </Link>
        <Link to="/terms" className="text-primary underline underline-offset-4">
          {t("legal.termsLink", "Terms of Service")}
        </Link>
      </nav>
    </RealmScreen>
  );
}
