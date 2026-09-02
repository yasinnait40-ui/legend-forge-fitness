import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { todayKey, useGame } from "@/lib/game-store";
import { sendDailyReminder, wasReminderPrompted } from "@/lib/notifications";

export function ReminderMonitor() {
  const game = useGame();
  const { t } = useTranslation();

  useEffect(() => {
    if (!wasReminderPrompted() || game.lastActiveDate === todayKey()) return;
    sendDailyReminder(t("notifications.dailyReminder"));
  }, [game.lastActiveDate, t]);

  return null;
}
