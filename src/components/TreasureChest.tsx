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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-primary/60 bg-card p-6 text-center shadow-[0_0_40px_color-mix(in_oklab,var(--primary)_30%,transparent)]">
        {!opened ? (
          <>
            <Gift className="mx-auto mb-3 h-16 w-16 text-primary animate-pulse" />
            <h2 className="font-display text-xl font-bold uppercase tracking-[0.15em] text-primary">
              {t("treasure.title")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("treasure.invitation")}</p>
            <button
              onClick={open}
              className="mt-5 w-full rounded-md border border-primary/50 bg-primary/15 py-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-primary"
            >
              {t("treasure.open")}
            </button>
          </>
        ) : (
          <>
            <Sparkles className="mx-auto mb-3 h-12 w-12 text-primary" />
            <h2 className="font-display text-xl font-bold uppercase tracking-[0.15em] text-primary">
              {t("treasure.revealed")}
            </h2>
            <p className="mt-4 text-lg text-foreground">
              {reward.type === "xp"
                ? t("treasure.xp", { amount: reward.amount })
                : t("treasure.cosmetic")}
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-md border border-primary/50 py-3 font-display text-sm font-bold uppercase tracking-[0.15em] text-primary"
            >
              {t("treasure.claim")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
