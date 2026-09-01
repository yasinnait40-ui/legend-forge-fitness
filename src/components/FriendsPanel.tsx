import { useEffect, useState } from "react";
import { Copy, Share2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RunePanel } from "@/components/RunePanel";
import { useGame } from "@/lib/game-store";

const CODE_KEY = "aethora-invite-code";

function makeCode() {
  return `AETH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function FriendsPanel() {
  const { t } = useTranslation();
  const game = useGame();
  const [code, setCode] = useState("");
  const [friendCode, setFriendCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [friends, setFriends] = useState<string[]>([]);

  useEffect(() => {
    const existing = window.localStorage.getItem(CODE_KEY);
    const next = existing || makeCode();
    if (!existing) window.localStorage.setItem(CODE_KEY, next);
    setCode(next);
  }, []);

  async function shareInvite() {
    const text = `${t("social.inviteMessage")} ${code}`;
    if (navigator.share) await navigator.share({ title: "Aethora", text });
    else {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  function addFriend() {
    const normalized = friendCode.trim().toUpperCase();
    if (!normalized || normalized === code || friends.includes(normalized)) return;
    setFriends((current) => [...current, normalized]);
    setFriendCode("");
  }

  async function copyCode() {
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="mt-6 space-y-3" aria-labelledby="friends-heading">
      <RunePanel>
        <div className="flex items-start gap-3">
          <Users className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 id="friends-heading" className="font-display text-lg font-bold">
              {t("social.title")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("social.subtitle")}</p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("social.yourCode")}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <code className="font-mono text-lg font-bold tracking-widest text-primary">{code || "·········"}</code>
            <button type="button" onClick={copyCode} className="btn-rune-ghost !w-auto px-3 py-2" aria-label={t("social.copyCode")}>
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <button type="button" onClick={shareInvite} className="btn-gold mt-3 flex items-center justify-center gap-2">
            <Share2 className="h-4 w-4" aria-hidden="true" />
            {copied ? t("social.copied") : t("social.inviteFriend")}
          </button>
        </div>
        <div className="mt-4 border-t border-border/60 pt-4">
          <p className="font-semibold">{t("social.friendsList")}</p>
          {friends.length === 0 ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("social.empty")}</p>
          ) : (
            <ul className="mt-3 space-y-2" aria-label={t("social.friendsList")}>
              {friends.map((friend) => (
                <li key={friend} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
                  <code className="font-mono text-sm text-primary">{friend}</code>
                  <span className="text-xs text-muted-foreground">{t("social.pending")}</span>
                </li>
              ))}
            </ul>
          )}
          <label className="mt-3 block text-xs text-muted-foreground" htmlFor="friend-code">{t("social.addCode")}</label>
          <div className="mt-2 flex gap-2">
            <input id="friend-code" value={friendCode} onChange={(event) => setFriendCode(event.target.value.toUpperCase())} placeholder="AETH-XXXXXX" className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm" />
            <button type="button" onClick={addFriend} disabled={!friendCode.trim()} className="btn-rune-ghost !w-auto px-3 py-2">{t("social.add")}</button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("social.cloudLimit")}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-md border border-border/60 p-2"><strong className="block text-lg text-primary">{game.streak}</strong><span className="text-xs text-muted-foreground">{t("social.yourStreak")}</span></div>
          <div className="rounded-md border border-border/60 p-2"><strong className="block text-lg text-primary">{Math.floor(game.xp / 100) + 1}</strong><span className="text-xs text-muted-foreground">{t("social.yourLevel")}</span></div>
        </div>
      </RunePanel>
    </section>
  );
}
