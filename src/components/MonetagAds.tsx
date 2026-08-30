import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Monetag integration
 * Site code: 27d91babd
 * Banner zone:  a1vqtk2vytm3017u
 * Rewarded zone: 1fya3mwg7wkwjbkc
 *
 * If Monetag gave you a specific script host (e.g. https://example.com/tag.min.js),
 * replace MONETAG_TAG_HOST below with that exact URL — the zone IDs are already wired.
 */
const MONETAG_TAG_HOST = "https://inklinkor.com/tag.min.js";
const BANNER_ZONE = "a1vqtk2vytm3017u";
const REWARDED_ZONE = "1fya3mwg7wkwjbkc";

function loadMonetagScript(zone: string) {
  const s = document.createElement("script");
  s.src = MONETAG_TAG_HOST;
  s.setAttribute("data-zone", zone);
  s.setAttribute("data-cfasync", "false");
  s.async = true;
  (document.body || document.documentElement).appendChild(s);
}

export function MonetagBanner() {
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    loadMonetagScript(BANNER_ZONE);
  }, []);
  return (
    <div className="mt-6 mb-2">
      {/* Monetag Banner Ad Placeholder */}
      <div
        id="monetag-banner"
        className="monetag-ad-container rune-panel min-h-[100px] items-center overflow-hidden"
        style={{ display: "flex", justifyContent: "center", margin: "15px 0" }}
      >
        <p className="font-display text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
          Advertisement
        </p>
      </div>
    </div>
  );
}

export function MonetagRewardedButton({ onReward }: { onReward?: () => void }) {
  const { t } = useTranslation();
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    loadMonetagScript(REWARDED_ZONE);
  }, []);
  return (
    <button
      type="button"
      className="rune-button mt-3 inline-flex items-center gap-2 px-4 py-2 text-[0.65rem] uppercase tracking-[0.2em]"
      onClick={onReward}
    >
      <Sparkles className="size-3.5" />
      {t("ads.watchReward", "Watch an ad for a blessing")}
    </button>
  );
}
