import { toast } from "sonner";
import { achievementById, RARITY_LABELS } from "./game-data";
import type { AwardResult } from "./game-store";

/** Announce XP, level-ups and freshly unlocked achievements via toasts. */
export function announceRewards(result: AwardResult, label: string) {
  toast.success(label, { description: `+${result.xpGained} XP` });

  if (result.autoCompletedQuest) {
    toast.success("Guardian's Discipline sealed", {
      description: "+100 XP — you conquered a trial today",
    });
  }

  if (result.leveledUp) {
    toast("LEVEL UP", {
      description: `Your legend grows — you are now Level ${result.newLevel}.`,
      duration: 6000,
    });
  }

  for (const id of result.unlocked) {
    const a = achievementById(id);
    if (a) {
      toast(`Achievement Unlocked — ${a.name}`, {
        description: `${RARITY_LABELS[a.rarity]} · ${a.flavor}`,
        duration: 6000,
      });
    }
  }
}
