import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import guildHall from "@/assets/guild-hall.jpg";
import { RealmScreen } from "@/components/RealmScreen";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Your Sigil | AETHORA" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) setReady(true);
    });
    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (sessionData.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) {
      setMessage("Your new sigil must contain at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setMessage("The two sigils do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage(
        error.message.toLowerCase().includes("expired")
          ? "This recovery link has expired. Request a new one from the Oath Stone."
          : "This recovery link is invalid or has already been used. Request a new one.",
      );
      return;
    }
    await supabase.auth.signOut();
    toast.success("Your sigil has been reforged.");
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <RealmScreen image={guildHall} alt="A candlelit guild hall of ancient stone" veil="strong">
      <header className="pt-12 text-center">
        <RuneHeading>Reset Your Sigil</RuneHeading>
        <p className="mx-auto mt-3 max-w-xs text-sm text-muted-foreground">
          Forge a new password for your AETHORA account.
        </p>
      </header>
      <RunePanel className="mt-6">
        {message && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {message}
          </p>
        )}
        {!ready ? (
          <div className="space-y-4 text-center">
            <p className="text-sm leading-6 text-muted-foreground">
              The recovery link is missing, expired, or invalid.
            </p>
            <Link to="/auth" className="btn-gold">
              <RotateCcw className="h-4 w-4" /> Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={updatePassword} className="space-y-3">
            <label className="block">
              <span className="font-display text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
                New Sigil
              </span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-md border border-border/70 bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary/60"
              />
            </label>
            <label className="block">
              <span className="font-display text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
                Confirm Sigil
              </span>
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-1 w-full rounded-md border border-border/70 bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary/60"
              />
            </label>
            <button type="submit" disabled={busy} className="btn-gold disabled:opacity-60">
              <KeyRound className="h-4 w-4" /> {busy ? "Reforging…" : "Update Password"}
            </button>
          </form>
        )}
      </RunePanel>
    </RealmScreen>
  );
}
