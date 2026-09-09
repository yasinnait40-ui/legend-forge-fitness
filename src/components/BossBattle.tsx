import { useCallback, useState } from "react";
import type { CSSProperties } from "react";
import { Swords, Shield, Sparkles, X, Check } from "lucide-react";
import { RealmScreen } from "@/components/RealmScreen";
import { RunePanel, RuneHeading } from "@/components/RunePanel";
import { damageBoss, isBossDefeated, remainingHp } from "@/lib/boss-store";
import { completeTrial } from "@/lib/game-store";
import { playSound } from "@/lib/sound-store";
import { useTranslation } from "react-i18next";
import type { Boss } from "@/lib/boss-data";

interface BossBattleProps {
  boss: Boss;
  onExit: () => void;
  onVictory: () => void;
}

const MOVES = [
  { key: "attack", label: "Attack", icon: Swords, dmgMin: 30, dmgMax: 55 },
  { key: "focus", label: "Focused Strike", icon: Sparkles, dmgMin: 45, dmgMax: 70 },
  { key: "defend", label: "Guard", icon: Shield, dmgMin: 10, dmgMax: 20 },
] as const;

interface FloatingHit {
  id: number;
  amount: number;
}

export function BossBattle({ boss, onExit, onVictory }: BossBattleProps) {
  const { t } = useTranslation();
  const [hp, setHp] = useState(() => remainingHp(boss.id, boss.maxHp));
  const [defeated, setDefeated] = useState(() => isBossDefeated(boss.id));
  const [flash, setFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const [rewarded, setRewarded] = useState(false);
  const [hits, setHits] = useState<FloatingHit[]>([]);
  const hitCounter = useState({ current: 0 })[0];

  const strike = useCallback(
    (move: (typeof MOVES)[number]) => {
      if (defeated) return;
      const dmg = Math.round(move.dmgMin + Math.random() * (move.dmgMax - move.dmgMin));
      const won = damageBoss(boss.id, boss.maxHp, dmg);
      setHp(remainingHp(boss.id, boss.maxHp));

      // Floating damage number
      hitCounter.current += 1;
      const id = hitCounter.current;
      setHits((prev) => [...prev, { id, amount: dmg }]);
      setTimeout(() => {
        setHits((prev) => prev.filter((h) => h.id !== id));
      }, 900);

      // Flash + shake feedback
      setFlash(true);
      setShake(true);
      playSound("battleHit");
      setTimeout(() => setFlash(false), 180);
      setTimeout(() => setShake(false), 260);

      if (won) {
        setDefeated(true);
        playSound("battleVictory");
        if (!rewarded) {
          setRewarded(true);
          const xp = Math.round(boss.maxHp * 0.6);
          void completeTrial("boss-fight", "Boss Fight", xp, { strength: 3, vitality: 2 });
        }
      }
    },
    [boss, defeated, rewarded, hitCounter],
  );

  const pct = Math.max(0, Math.round((hp / boss.maxHp) * 100));

  const panelStyle: CSSProperties = {
    "--zone-color": `oklch(0.55 0.18 ${boss.accentHue})`,
  } as CSSProperties;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-background">
      {/* Full-bleed boss image, properly composed — no aggressive crop */}
      <div className="absolute inset-0">
        <img
          src={boss.image}
          alt={boss.name}
          className={`h-full w-full object-cover object-center transition-transform duration-150 ${
            shake ? "scale-[1.015]" : "scale-100"
          }`}
          draggable={false}
        />
        {/* Red damage flash overlay */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-150"
          style={{
            background: "rgba(180,20,20,0.35)",
            opacity: flash ? 1 : 0,
          }}
        />
        {/* Dark gradient so the UI stays readable */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/75 via-black/25 to-black/80" />
      </div>

      {/* Floating damage numbers */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {hits.map((h) => (
          <span
            key={h.id}
            className="absolute font-display text-3xl font-black text-primary drop-shadow-[0_0_10px_rgba(0,0,0,0.9)]"
            style={{
              animation: "boss-dmg-float 0.9s ease-out forwards",
            }}
          >
            -{h.amount}
          </span>
        ))}
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <button
          type="button"
          onClick={onExit}
          className="mx-4 mt-4 flex w-fit items-center gap-1 rounded-full bg-black/40 px-3 py-1.5 text-xs text-white/90 backdrop-blur-sm"
        >
          <X className="h-4 w-4" /> {t("common.close", "Close")}
        </button>

        <div className="mt-auto px-4 pb-6">
          <div className="mx-auto max-w-lg">
            <div className="text-center">
              <h2
                className="font-display text-2xl font-black uppercase tracking-[0.1em] drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
                style={{ color: "var(--zone-color)" }}
              >
                {boss.name}
              </h2>
              <p className="mt-1 text-xs italic text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                {boss.epithet}
              </p>
            </div>

            {/* Ornate HP bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-white/85">
                <span className="font-display uppercase tracking-[0.2em]">HP</span>
                <span className="font-display font-bold text-primary">{pct}%</span>
              </div>
              <div className="relative mt-2 rounded-md border-2 border-primary/50 bg-black/60 p-[3px] shadow-[0_0_16px_rgba(0,0,0,0.6)]">
                <div className="h-3 w-full overflow-hidden rounded-sm bg-black/70">
                  <div
                    className="relative h-full rounded-sm bg-gradient-to-r from-red-800 via-orange-500 to-primary transition-[width] duration-300"
                    style={{ width: `${pct}%` }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                        animation: "boss-hp-shimmer 2.2s linear infinite",
                      }}
                    />
                  </div>
                </div>
                <span
                  className="pointer-events-none absolute -left-1 -top-1 h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
                  aria-hidden="true"
                />
                <span
                  className="pointer-events-none absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
                  aria-hidden="true"
                />
              </div>
            </div>

            {!defeated ? (
              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {MOVES.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => strike(m)}
                    className="group relative flex flex-col items-center gap-1.5 overflow-hidden rounded-lg border-2 border-primary/50 bg-gradient-to-b from-black/50 to-black/70 py-3.5 text-[0.6rem] font-bold uppercase tracking-wide text-primary shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-sm transition-all duration-150 active:scale-95"
                  >
                    <span
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(circle at 50% 0%, color-mix(in oklab, var(--primary) 35%, transparent), transparent 70%)",
                      }}
                    />
                    <m.icon className="h-5 w-5 drop-shadow-[0_0_6px_color-mix(in_oklab,var(--primary)_60%,transparent)]" />
                    {m.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-lg border-2 border-primary/50 bg-black/50 py-5 text-center backdrop-blur-sm">
                <Check className="mx-auto mb-2 h-10 w-10 text-primary" />
                <p className="font-display text-lg font-bold uppercase tracking-wide text-primary">
                  {t("boss.victory", "Vanquished!")}
                </p>
                <button type="button" onClick={onVictory} className="btn-gold mt-4">
                  {t("common.continue", "Continue")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes boss-dmg-float {
          0% { opacity: 0; transform: translateY(0) scale(0.8); }
          15% { opacity: 1; transform: translateY(-10px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-70px) scale(1); }
        }
        @keyframes boss-hp-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}