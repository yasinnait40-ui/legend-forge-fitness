const PERMISSION_KEY = "aethora-notification-permission-prompted";
const REMINDER_KEY = "aethora-notification-reminder";

export function requestReminderPermission(message: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.localStorage.getItem(PERMISSION_KEY) === "1") return;
  window.localStorage.setItem(PERMISSION_KEY, "1");
  if (Notification.permission === "default") {
    void Notification.requestPermission().then((permission) => {
      if (permission === "granted") sendDailyReminder(message);
    });
  } else if (Notification.permission === "granted") {
    sendDailyReminder(message);
  }
}

export function sendDailyReminder(message: string): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  const date = new Date().toISOString().slice(0, 10);
  if (window.localStorage.getItem(REMINDER_KEY) === date) return false;
  new Notification("Aethora", { body: message, tag: `aethora-reminder-${date}` });
  window.localStorage.setItem(REMINDER_KEY, date);
  return true;
}

export function wasReminderPrompted(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(PERMISSION_KEY) === "1";
}
