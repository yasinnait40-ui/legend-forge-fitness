/**
 * Monetag Banner Ad Placeholder
 *
 * Paste your Monetag script inside the useEffect below and replace
 * YOUR_ZONE_ID_HERE with your real zone id:
 *
 * <!-- Monetag Banner Ad Script -->
 * (function(s,u,z,p){s.src=u,s.setAttribute('data-zone',z),p.appendChild(s);})
 *   (document.createElement('script'),'https://themostfamousnetwork.com','YOUR_ZONE_ID_HERE',document.body||document.documentElement);
 */
export function MonetagAdSlot() {
  return (
    <div className="mt-6 mb-2">
      {/* Monetag Banner Ad Placeholder */}
      <div
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
