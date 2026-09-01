import { Activity, ShieldCheck } from "lucide-react";
import { RunePanel } from "@/components/RunePanel";
import { useTranslation } from "react-i18next";

export function HealthSyncInfo() {
  const { t } = useTranslation();

  return (
    <RunePanel className="mt-3 space-y-4">
      <div className="flex items-start gap-3">
        <Activity className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="font-semibold text-foreground">{t("health.title")}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("health.status")}</p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-md border border-border/60 bg-background/30 p-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm leading-6 text-muted-foreground">{t("health.privacy")}</p>
      </div>
      <div className="space-y-2 text-sm leading-6 text-muted-foreground">
        <p>
          <strong className="text-foreground">{t("health.webHeading")}</strong> {t("health.web")}
        </p>
        <p>
          <strong className="text-foreground">{t("health.nativeHeading")}</strong>{" "}
          {t("health.native")}
        </p>
      </div>
    </RunePanel>
  );
}
