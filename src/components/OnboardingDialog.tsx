import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dumbbell, Flame, HeartPulse, Timer, TrendingDown } from "lucide-react";
import { completeOnboarding, useOnboarding, type GoalId } from "@/lib/onboarding";

const GOALS: { id: GoalId; icon: typeof Flame; key: string }[] = [
  { id: "lose-fat", icon: TrendingDown, key: "onboarding.goal.loseFat" },
  { id: "build-muscle", icon: Dumbbell, key: "onboarding.goal.buildMuscle" },
  { id: "improve-fitness", icon: Flame, key: "onboarding.goal.improveFitness" },
  { id: "general-health", icon: HeartPulse, key: "onboarding.goal.generalHealth" },
];

const DAYS = [1, 2, 3, 4, 5, 6, 7];
const DURATIONS = [15, 30, 45, 60];

/**
 * Zero-friction 60-second onboarding. Collects name, goal, training days and
 * session duration in one quick step. No account required.
 */
export function OnboardingDialog() {
  const { t } = useTranslation();
  const profile = useOnboarding();
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<GoalId>("general-health");
  const [days, setDays] = useState(3);
  const [minutes, setMinutes] = useState(30);

  if (profile) return null;

  const goalLabel = (g: GoalId) =>
    t(GOALS.find((x) => x.id === g)?.key ?? "onboarding.goal.generalHealth");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-3 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={t("onboarding.title", "Welcome, Traveler")}
    >
      {/* Ambient glow behind onboarding */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_10%,_color-mix(in_oklab,_var(--primary)_18%,_transparent)_0%,_transparent_60%)]" />
      <div className="rune-panel w-full max-w-md p-5 relative">
        <p className="font-display text-[0.6rem] font-semibold uppercase tracking-[0.34em] text-accent">
          {t("onboarding.kicker", "The Realm Beckons")}
        </p>
        <h2 className="font-display mt-1 text-2xl font-black tracking-[0.06em] textgorn">
          {t("onboarding.title", "Welcome, Traveler")}
        </h2>
        <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
          {t(
            "onboarding.intro",
            "Four quick answers shape your first quest. No account needed yet.",
          )}
        </p>

        <label className="mt-4 block">
          <span className="font-display text-[0.62rem] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            {t("onboarding.name", "What shall the realm call you?")}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder={t("onboarding.namePlaceholder", "Wanderer")}
            className="mt-1.5 h-10 w-full rounded-md border border-input bg-background/70 px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </label>

        <p className="mt-4 font-display text-[0.62rem] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          {t("onboarding.goal.label", "Your quest")}
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {GOALS.map((g) => {
            const Icon = g.icon;
            const active = goal === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setGoal(g.id)}
                className={
                  "flex items-center gap-2 rounded-md border px-3 py-2.5 text-left text-xs font-semibold transition " +
                  (active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-background/50 text-foreground hover:border-primary/40")
                }
                aria-pressed={active}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {goalLabel(g.id)}
              </button>
            );
          })}
        </div>

        <p className="mt-4 font-display text-[0.62rem] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          {t("onboarding.days.label", "Training days per week")}
        </p>
        <div className="mt-1.5 flex gap-1.5">
          {DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={
                "h-9 flex-1 rounded-md border font-display text-sm font-bold transition " +
                (days === d
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-background/50 text-muted-foreground hover:border-primary/40")
              }
            >
              {d}
            </button>
          ))}
        </div>

        <p className="mt-4 font-display text-[0.62rem] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          {t("onboarding.duration.label", "Session length")}
        </p>
        <div className="mt-1.5 flex gap-2">
          {DURATIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(m)}
              aria-pressed={minutes === m}
              className={
                "flex h-9 flex-1 items-center justify-center gap-1 rounded-md border text-xs font-semibold transition " +
                (minutes === m
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-background/50 text-muted-foreground hover:border-primary/40")
              }
            >
              <Timer className="h-3.5 w-3.5" />
              {m} {t("onboarding.duration.min", "min")}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() =>
            completeOnboarding({
              name: name.trim() || t("onboarding.defaultName", "Wanderer"),
              goal,
              trainingDays: days,
              sessionMinutes: minutes,
            })
          }
          className="btn-gold mt-5"
        >
          {t("onboarding.start", "Forge My First Quest")}
        </button>
        <p className="mt-2 text-center text-[0.62rem] italic text-muted-foreground">
          {t(
            "onboarding.privacy",
            "Your answers stay on this device until you bind a cloud legend.",
          )}
        </p>
      </div>
    </div>
  );
}
