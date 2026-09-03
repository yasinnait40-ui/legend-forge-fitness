import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";
import guildHall from "@/assets/guild-hall.jpg";
import { RealmScreen } from "@/components/RealmScreen";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const authCallbackUrl = () => {
  const viteEnv = import.meta.env as ImportMetaEnv & {
    NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL?: string;
  };
  return viteEnv.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`;
};

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "The Oath Stone — Sign In | AETHORA" },
      {
        name: "description",
        content:
          "Swear your oath to bind your legend to the cloud. Sign in or create an account so your XP, stats, quests and streaks follow you to any device.",
      },
      { property: "og:title", content: "The Oath Stone — Sign In | AETHORA" },
      {
        property: "og:description",
        content: "Bind your AETHORA legend to the cloud and never lose your progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Log environment and configuration info
    const viteEnv = import.meta.env as ImportMetaEnv & {
      VITE_SUPABASE_URL?: string;
      NEXT_PUBLIC_SUPABASE_URL?: string;
    };
    const supabaseUrl = viteEnv.VITE_SUPABASE_URL || viteEnv.NEXT_PUBLIC_SUPABASE_URL;
    console.log("🔐 Auth Page Loaded");
    console.log("🌐 Supabase URL:", supabaseUrl?.substring(0, 20) + "..." || "NOT SET");
    console.log("🔗 Redirect URL:", authCallbackUrl());

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        console.log("✅ Session found, redirecting home");
        void navigate({ to: "/", replace: true });
      }
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: authCallbackUrl(),
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Your oath is sworn — welcome, warrior.");
          void navigate({ to: "/", replace: true });
        } else {
          setVerificationSent(true);
          toast("A sealed scroll awaits", {
            description: "Check your email and confirm to complete your oath.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        toast.success("The gates open — welcome back.");
        void navigate({ to: "/", replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : "";
      const safeMessage = message.includes("email not confirmed")
        ? "Confirm your email before signing in."
        : message.includes("email_address_not_authorized") || message.includes("not authorized")
          ? "This project cannot send email to this address yet. Use an approved email or configure SMTP."
          : message.includes("over_email_send_rate_limit") || message.includes("rate limit")
            ? "Email limit reached. Wait a little and try again."
            : message.includes("signup_disabled") || message.includes("signups not allowed")
              ? "Account creation is disabled in Supabase Auth. Enable email signups."
              : message.includes("already registered") ||
                  message.includes("already been registered")
                ? "An account already exists for this email. Switch to Sign In."
                : message.includes("invalid email") || message.includes("email_address_invalid")
                  ? "Enter a valid email address."
                  : message.includes("password") &&
                      (message.includes("6") || message.includes("weak"))
                    ? "Choose a stronger password."
                    : message.includes("fetch") || message.includes("network")
                      ? "Cannot reach Supabase Auth. Check the project connection."
                      : mode === "signin"
                        ? "Invalid email or password."
                        : "We could not create the account. Check your details and try again.";
      toast.error(safeMessage);
    } finally {
      setBusy(false);
    }
  }

  async function onForgotPassword() {
    if (!email.trim()) {
      toast.error("Enter your email address first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error("We could not send a recovery email. Please check the address and try again.");
      return;
    }
    toast.success("Recovery instructions sent. Check your email.");
  }

  async function resendVerification() {
    if (!email.trim()) {
      toast.error("Enter your email address first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: authCallbackUrl(),
      },
    });
    setBusy(false);
    if (error) {
      toast.error("We could not resend verification. Please try again later.");
      return;
    }
    setVerificationSent(true);
    toast.success("Verification instructions sent. Check your email.");
  }

  return (
    <RealmScreen
      image={guildHall}
      alt="A candlelit guild hall of ancient stone where oaths are sworn"
      imagePosition="center 35%"
      veil="strong"
    >
      <header className="pt-12 text-center">
        <RuneHeading>The Oath Stone</RuneHeading>
        <h1 className="text-glow-gold font-display mt-3 text-3xl font-black tracking-[0.08em] text-primary">
          {mode === "signin" ? "Return, Warrior" : "Swear Your Oath"}
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
          Bind your legend to the arcane archives so your XP, stats and streaks follow you
          everywhere.
        </p>
      </header>

      <RunePanel className="mt-6">
        <div className="mb-4 flex gap-2">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "font-display flex-1 rounded-md border px-3 py-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] transition-all",
                mode === m
                  ? "border-primary/60 bg-primary/10 text-primary shadow-[0_0_16px_color-mix(in_oklab,var(--primary)_22%,transparent)]"
                  : "border-border/60 text-muted-foreground hover:border-primary/40",
              )}
            >
              {m === "signin" ? "Sign In" : "Create"}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="font-display text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
              Raven Address
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="warrior@aethora.realm"
              className="mt-1 w-full rounded-md border border-border/70 bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60"
            />
          </label>
          <label className="block">
            <span className="font-display text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
              Secret Sigil
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-md border border-border/70 bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60"
            />
          </label>

          {mode === "signin" && (
            <div className="flex items-center justify-between gap-3 text-xs">
              <button
                type="button"
                disabled={busy}
                onClick={() => void onForgotPassword()}
                className="text-primary underline-offset-4 hover:underline"
              >
                Forgot your sigil?
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void resendVerification()}
                className="text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                Resend verification
              </button>
            </div>
          )}
          {verificationSent && (
            <p className="text-xs leading-5 text-muted-foreground" role="status">
              Verification email sent. Confirm your account before entering the realm.
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-gold mt-2 disabled:opacity-60">
            {mode === "signin" ? (
              <>
                <LogIn className="h-4 w-4" /> Enter the Realm
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Forge My Legend
              </>
            )}
          </button>
        </form>
      </RunePanel>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Not ready to swear?{" "}
        <Link to="/" className="text-primary underline-offset-4 hover:underline">
          Wander on without binding
        </Link>{" "}
        — progress stays on this device only.
      </p>
    </RealmScreen>
  );
}
