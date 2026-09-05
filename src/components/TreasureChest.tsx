import { useState } from "react";
import { Gift, Sparkles } from "lucide-react";
import type { TreasureReward } from "@/lib/game-store";
import { playSound } from "@/lib/sound-store";
import { useTranslation } from "react-i18next";

export function TreasureChest({
  reward,
  onClose,
}: {
  reward: TreasureReward;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  function open() {
    setOpened(true);
    playSound("levelUp");
  }
  return (
    <div
      className="chest-overlay fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t("treasure.title")}
    >
      <div className="chest-card relative w-full max-w-sm overflow-hidden rounded-xl border border-primary/60 bg-card p-6 text-center shadow-[0_0_40px_color-mix(in_oklab,var(--primary)_30%,transparent)]">
        {!opened ? (
          <>
            <Gift className="chest-sealed-icon mx-auto mb-3 h-16 w-16 text-primary" />
            <h2 className="font-display text-xl font-bold uppercase tracking-[0.15em] text-primary">
              {t("treasure.title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("treasure.invitation")}</p>
            <button onClick={open} className="btn-gold mt-5">
              {t("treasure.open")}
            </button>
          </>
        ) : (
          <>
            {/* Rotating god-rays behind the revealed reward. */}
            <div className="chest-rays" aria-hidden="true" />
            <div className="chest-reveal relative">
              <Sparkles className="mx-auto mb-3 h-12 w-12 text-primary drop-shadow-[0_0_14px_color-mix(in_oklab,var(--primary)_60%,transparent)]" />
              <h2 className="font-display text-xl font-bold uppercase tracking-[0.15em] text-primary">
                {t("treasure.revealed")}
              </h2>
            </div>
            <p className="chest-reveal-text relative mt-4 text-lg font-semibold text-foreground">
              {reward.type === "xp"
                ? t("treasure.xp", { amount: reward.amount })
                : t("treasure.cosmetic")}
            </p>
            <button onClick={onClose} className="btn-rune-ghost chest-reveal-text relative mt-5">
              {t("treasure.claim")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
