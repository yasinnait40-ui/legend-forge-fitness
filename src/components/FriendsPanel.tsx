import { useEffect, useState } from "react";
import { Copy, Share2, Users, Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RunePanel } from "@/components/RunePanel";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function FriendsPanel() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("friend_code")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.friend_code) setCode(data.friend_code);
      });
  }, [user]);

  async function copyCode() {
    if (!code) return;
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareInvite() {
    const text = `Join me in Aethora! Use my code: ${code}`;
    if (navigator.share) await navigator.share({ title: "Aethora", text });
    else {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <section className="mt-6 space-y-3" aria-labelledby="friends-heading">
      <RunePanel>
        <div className="flex items-start gap-3">
          <Users className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 id="friends-heading" className="font-display text-lg font-bold">
              {t("social.title", "Allies")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t("social.subtitle", "Share your code to forge alliances")}
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("social.yourCode", "Your Code")}
          </p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <code className="font-mono text-lg font-bold tracking-widest text-primary">
              {code || "····"}
            </code>
            <button
              type="button"
              onClick={() => void copyCode()}
              className="btn-rune-ghost !w-auto px-3 py-2"
              aria-label={t("social.copyCode", "Copy code")}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={() => void shareInvite()}
            className="btn-gold mt-3 flex items-center justify-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            {copied ? t("social.copied", "Copied!") : t("social.inviteFriend", "Invite Friend")}
          </button>
        </div>
        <Link to="/friends" className="btn-rune-ghost mt-4 flex items-center justify-center gap-2">
          <Users className="h-4 w-4" /> Open Hall of Allies
        </Link>
      </RunePanel>
    </section>
  );
}
