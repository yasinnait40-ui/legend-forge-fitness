import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "@/lib/game-store";
import { sendDailyReminder } from "@/lib/notifications";

export function ReminderMonitor() {
  const game = useGame();
  const { t } = useTranslation();

  useEffect(() => {
    sendDailyReminder(game, t("notifications.dailyReminder"));
  }, [game, t]);

  return null;
}
