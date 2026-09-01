import { todayKey, questsDoneToday, trialsDoneToday, type GameState } from "./game-store";

const PERMISSION_PROMPTED = "aethora_notification_prompted";
const LAST_REMINDER = "aethora_last_reminder";

export function requestReminderPermission(message: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  if (localStorage.getItem(PERMISSION_PROMPTED)) return;
  localStorage.setItem(PERMISSION_PROMPTED, "1");
  void Notification.requestPermission().then((permission) => {
    if (permission === "granted") new Notification("AETHORA", { body: message, icon: "/favicon.png" });
  });
}

export function sendDailyReminder(game: GameState, message: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (questsDoneToday(game).length || trialsDoneToday(game).length) return;
  const today = todayKey();
  if (localStorage.getItem(LAST_REMINDER) === today) return;
  localStorage.setItem(LAST_REMINDER, today);
  new Notification("AETHORA", { body: message, icon: "/favicon.png" });
}
