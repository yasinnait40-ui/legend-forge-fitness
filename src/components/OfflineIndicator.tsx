import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getPendingCount, handleReconnect } from "@/lib/cloud-sync";

/**
 * Localized offline banner. Appears only while the browser is offline and
 * there are activities waiting to sync. Progress keeps saving locally.
 */
export function OfflineIndicator() {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const update = () => {
      setOffline(!navigator.onLine);
      setPending(getPendingCount());
    };
    update();
    const onOnline = () => {
      update();
      handleReconnect();
      // Refresh the count shortly after replay attempts begin.
      setTimeout(update, 1500);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", update);
    const interval = setInterval(update, 4000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", update);
      clearInterval(interval);
    };
  }, []);

  if (!offline || pending === 0) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-accent/90 px-4 py-1.5 text-[0.7rem] font-semibold text-accent-foreground shadow-lg backdrop-blur-sm"
    >
      <CloudOff className="h-3.5 w-3.5" />
      <span>{t("offline.banner", "Offline — progress saved on this device")}</span>
      <span className="inline-flex items-center gap-1 opacity-80">
        <RefreshCw className="h-3 w-3" />
        {t("offline.pending", "{{count}} quests will sync", { count: pending })}
      </span>
    </div>
  );
}
