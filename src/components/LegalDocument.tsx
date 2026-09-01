import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RuneHeading, RunePanel } from "@/components/RunePanel";
import { RealmScreen } from "@/components/RealmScreen";
import hallOfLegends from "@/assets/hall-of-legends.jpg";

type LegalKind = "privacy" | "terms";

export function LegalDocument({ kind }: { kind: LegalKind }) {
  const { t } = useTranslation();
  const prefix = `legal.${kind}`;
  const sections = Array.from({ length: kind === "privacy" ? 6 : 5 }, (_, index) => index + 1);
  const fallback =
    kind === "privacy"
      ? [
          "Account and cloud data",
          "Fitness information",
          "Advertising",
          "How information is used",
          "Sharing and retention",
          "Choices and contact",
        ]
      : [
          "The service",
          "Health and safety",
          "Accounts and fair play",
          "Availability and changes",
          "Ads and responsibility",
        ];
  const fallbackText =
    kind === "privacy"
      ? [
          "Supabase Authentication handles sign-in. Game progress such as level, XP, streaks, quest and workout completion, and settings may be stored in Supabase.",
          "Activity and workout details you enter are used for game progress and rewards. The current web app does not connect to Apple Health, Google Fit, or Health Connect.",
          "Advertisements are displayed through Monetag where enabled. Its privacy policy governs information it processes.",
          "Information is used to authenticate users, save progress, operate features, and maintain security.",
          "Data may be processed by Supabase and Monetag to provide their services, or disclosed when required by law.",
          "You may stop using the app or request account-data assistance through the app publisher.",
        ]
      : [
          "Aethora provides fantasy fitness quests, workouts, progression, streaks, rewards, reminders, and entertainment features.",
          "Aethora is not medical advice or a substitute for professional care. Choose activities appropriate for you.",
          "Keep credentials secure and do not abuse, disrupt, reverse engineer, or access the service without authorization.",
          "Features may change or become unavailable, and progress can be affected by device, network, authentication, or service failures.",
          "Ads may appear through Monetag. Aethora is not responsible for third-party services or external content.",
        ];

  return (
    <RealmScreen
      image={hallOfLegends}
      alt="A quiet hall of ancient legal scrolls"
      imagePosition="center 25%"
    >
      <header className="pt-10 text-center">
        <p className="font-display text-[0.6rem] uppercase tracking-[0.35em] text-primary/80">
          AETHORA
        </p>
        <RuneHeading>
          {t(`${prefix}.title`, kind === "privacy" ? "Privacy Policy" : "Terms of Service")}
        </RuneHeading>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("legal.lastUpdated")}</p>
      </header>
      <RunePanel className="mt-6 space-y-6">
        <p className="text-sm leading-6 text-foreground/90">
          {t(
            `${prefix}.intro`,
            kind === "privacy"
              ? "Aethora is a fantasy fitness RPG. This policy describes the information used to provide the app."
              : "By using Aethora, you agree to these terms. If you do not agree, do not use the app.",
          )}
        </p>
        {sections.map((section) => (
          <section key={section}>
            <h2 className="font-display text-base font-bold text-primary">
              {t(`${prefix}.section${section}Title`, fallback[section - 1] ?? "")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t(`${prefix}.section${section}`, fallbackText[section - 1] ?? "")}
            </p>
          </section>
        ))}
        <p className="border-t border-border/60 pt-4 text-xs leading-5 text-muted-foreground">
          {t(
            "legal.disclaimer",
            "This general information is not legal advice. Review it with qualified counsel before store publication.",
          )}
        </p>
      </RunePanel>
      <nav
        className="mt-5 flex justify-center gap-4 pb-4 text-sm"
        aria-label={t("legal.navigation")}
      >
        <Link to="/privacy" className="text-primary underline underline-offset-4">
          {t("legal.privacyLink")}
        </Link>
        <Link to="/terms" className="text-primary underline underline-offset-4">
          {t("legal.termsLink")}
        </Link>
      </nav>
    </RealmScreen>
  );
}
