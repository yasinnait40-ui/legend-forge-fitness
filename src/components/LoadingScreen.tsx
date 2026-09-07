import { useEffect, useRef, useState } from "react";

/*
 * AETHORA loading/splash screen.
 * Full-screen artwork background with a subtle dark overlay for
 * readability of the loading bar. Calls onDone() when complete
 * so the parent (RootComponent) can unmount it.
 */

const LOADING_DURATION_MS = 2600;
const FADE_DURATION_MS = 650;

export function LoadingScreen({ onDone }: { onDone?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const raw = Math.min(elapsed / LOADING_DURATION_MS, 1);
      // ease-out so the bar rushes ahead then settles
      const eased = 1 - Math.pow(1 - raw, 2.2);
      setProgress(eased);

      if (raw < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setFading(true);
        setTimeout(() => onDone?.(), FADE_DURATION_MS);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#060402",
        overflow: "hidden",
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_DURATION_MS}ms ease-out`,
      }}
      role="status"
      aria-busy="true"
      aria-label="Loading the realm"
    >
      {/* Full-screen splash artwork */}
      <img
        src="/images/backgrounds/splash-gate.jpg"
        alt="A massive stone gateway flanked by horned guardian statues, torches glowing in the dark"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
        }}
        decoding="async"
        fetchPriority="high"
      />

      {/* Subtle dark overlay for readability of UI elements */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(6,4,2,0.35) 0%, rgba(6,4,2,0.5) 50%, rgba(6,4,2,0.7) 100%)",
        }}
      />

      {/* Loading bar */}
      <div
        style={{
          width: "min(260px, 70vw)",
          height: "6px",
          borderRadius: "999px",
          background: "rgba(8,5,3,0.65)",
          border: "1px solid rgba(180,150,50,0.35)",
          overflow: "hidden",
          boxShadow: "inset 0 0 8px rgba(0,0,0,0.5)",
          position: "relative",
        }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            background: "linear-gradient(90deg, rgba(180,150,50,0.5), #d4af37 70%, #b8962e)",
            boxShadow: "0 0 8px rgba(180,150,50,0.3)",
            transition: "width 0.08s linear",
          }}
        />
      </div>

      {/* Label */}
      <div
        style={{
          marginTop: "1rem",
          fontSize: "0.55rem",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "rgba(180,150,50,0.4)",
          textAlign: "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        Forging your legend…
      </div>
    </div>
  );
}

export default LoadingScreen;
