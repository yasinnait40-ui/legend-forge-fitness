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
        src="/images/backgrounds/splash-gate.png"
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

      {/* ----------------------------------
          Loading bar — ornate stone/sconce frame
          with pulsing gold rune-fill and shimmer sweep.
          ---------------------------------- */}
      <div
        className="running-bar-frame"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label="Realm awakening"
      >
        {/* Outer engraved stone frame */}
        <div
          aria-hidden="true"
          style={{
            position: "relative",
            width: "min(280px, 76vw)",
            height: "14px",
            borderRadius: "3px",
            // Stone-basalt surround with carved-gold rim
            background:
              "linear-gradient(180deg, rgba(20,16,12,0.92) 0%, rgba(12,9,7,0.95) 50%, rgba(20,16,12,0.88) 100%)",
            border: "1px solid rgba(140,110,35,0.45)",
            boxShadow:
              "inset 0 0 10px rgba(0,0,0,0.7), 0 0 6px rgba(0,0,0,0.5),",
            padding: "3px",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%)",
            maskImage:
              "linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%)",
          }}
        >
          {/* Inner channel */}
          <div
            aria-hidden="true"
            style={{
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(180deg, rgba(10,8,5,0.85) 0%, rgba(5,3,2,0.95) 100%)",
              boxShadow: "inset 0 0 6px rgba(0,0,0,0.7)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            {/* Gold fill — pulsing rune charge */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${progress * 100}%`,
                background:
                  "linear-gradient(90deg, rgba(160,130,40,0.55), #d4af37 62%, #b89020 100%)",
                boxShadow:
                  "0 0 10px rgba(180,150,50,0.3), inset 0 0 6px rgba(255,210,100,0.2)",
                // soft glow pulse synced to progress
                animation: `runePulse ${1.4 + progress * 0.6}s ease-in-out infinite alternate`,
              }}
            >
              {/* Sweeping shimmer highlight */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  left: "0%",
                  bottom: 0,
                  width: "18%",
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,230,160,0.35), transparent)",
                  filter: "blur(1px)",
                  animation: "shimmerSweep 1.9s ease-in-out infinite",
                }}
              />
            </div>

            {/* Right-hand sconce / hilt cap */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                width: "10px",
                height: "10px",
                background:
                  "radial-gradient(circle at 45% 40%, #d4af37 0%, rgba(180,150,50,0.7) 45%, transparent 70%)",
                boxShadow:
                  "0 0 5px rgba(180,150,50,0.4)",
                borderRadius: "50%",
              }}
            />
            {/* Left-hand sconce / hilt cap */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                top: "50%",
                transform: "translateY(-50%) scaleX(-1)",
                width: "10px",
                height: "10px",
                background:
                  "radial-gradient(circle at 45% 40%, #d4af37 0%, rgba(180,150,50,0.7) 45%, transparent 70%)",
                boxShadow:
                  "0 0 5px rgba(180,150,50,0.4)",
                borderRadius: "50%",
              }}
            />

            {/* Decorative engraved tick-marks along the channel */}
            {([0, 0.25, 0.5, 0.75].map((tick) => (
              <div
                key={tick}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: `${tick * 100}%`,
                  transform: "translate(-50%, -50%)",
                  width: "1px",
                  height: "7px",
                  background:
                    "linear-gradient(180deg, rgba(200,160,70,0.25) 0%, transparent 100%)",
                }}
              />
            )))}
          </div>
        </div>
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
