import { useEffect, useRef, useState } from "react";

/*
 * AETHORA loading/splash screen — dark fantasy grimdark aesthetic.
 * - Full-screen demon-gate artwork as background
 * - Dark vignette for readability
 * - Weathered gold "AETHORA" title
 * - Rising ember/fire-spark particles drifting upward from the bottom
 * - Thin gold-bordered progress bar
 * - Calls onDone() when complete so the parent can unmount it
 */

const GOLD = "#d4af37";
const GOLD_WEATHERED = "#b8962e";
const GOLD_RING = "rgba(180,150,50,0.7)";
const EMBER_BG = "rgba(8,5,3,0.6)";

export function LoadingScreen({ onDone }: { onDone?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);
  const frameRef = useRef<number | null>(null);
  const emberSeedRef = useRef<Array<{ x: number; delay: number; duration: number; size: number; drift: number }>>([]);

  useEffect(() => {
    if (emberSeedRef.current.length === 0) {
      const seed: Array<{ x: number; delay: number; duration: number; size: number; drift: number }> = [];
      for (let i = 0; i < 24; i++) {
        const r = Math.random();
        seed.push({
          x: 10 + Math.random() * 80,
          delay: r * 6,
          duration: 4 + r * 5,
          size: 1.2 + r * 2,
          drift: (Math.random() - 0.5) * 30,
        });
      }
      emberSeedRef.current = seed;
    }

    const start = performance.now();
    const DURATION_MS = 2200;

    const tick = (now: number) => {
      const elapsed = now - start;
      const raw = Math.min(elapsed / DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - raw, 2.2);
      setProgress(eased);
      if (raw < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setFading(true);
        setTimeout(() => {
          onDone?.();
        }, 700);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
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
        background: "#080503",
        color: GOLD,
        overflow: "hidden",
        textAlign: "center",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.65s ease-out",
      }}
      role="status"
      aria-busy="true"
      aria-label="Loading the realm"
    >
      {/* Full-screen demon-gate background image */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/images/backgrounds/demon-gate.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
          filter: "brightness(0.35) saturate(0.8)",
        }}
      />

      {/* Dark vignette for readability */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(8,5,3,0.6) 70%, rgba(8,5,3,0.92) 100%)",
        }}
      />
      {/* Bottom darkness to anchor the ember origin */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "50%",
          background:
            "linear-gradient(to top, rgba(8,5,3,0.95) 0%, rgba(30,15,5,0.4) 50%, transparent 100%)",
        }}
      />

      {/* Rising ember / fire-spark particles — drift upward from the bottom */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        {emberSeedRef.current.map((ember, i) => (
          <span
            key={i}
            className="ember-particle"
            style={{
              position: "absolute",
              left: `${ember.x}%`,
              bottom: "-5%",
              width: ember.size,
              height: ember.size,
              borderRadius: "50%",
              background:
                i % 4 === 0
                  ? "#d4af37"
                  : i % 4 === 1
                    ? "#8b3a0a"
                    : i % 4 === 2
                      ? "#c47020"
                      : "#6b2d08",
              opacity: 0,
              // @ts-expect-error CSS custom property for per-particle drift
              ["--drift"]: `${ember.drift}px`,
              animation: `emberRise ${ember.duration}s ease-out ${ember.delay}s infinite`,
              filter: `blur(${0.3 + (i % 3) * 0.2}px)`,
              willChange: "transform, opacity",
            }}
          />
        ))}
      </div>

      {/* Title block — weathered carved-stone feel */}
      <div
        style={{
          position: "relative",
          marginBottom: "2rem",
          textAlign: "center",
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontWeight: 700,
            fontSize: "clamp(2.2rem, 11vw, 4rem)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: GOLD_WEATHERED,
            textShadow: [
              "0 1px 0 rgba(0,0,0,0.9)",
              "0 2px 6px rgba(0,0,0,0.7)",
              "0 0 40px rgba(140,100,30,0.12)",
            ].join(", "),
          }}
        >
          AETHORA
        </div>
        {/* Thin decorative rule */}
        <div
          aria-hidden="true"
          style={{
            margin: "0.6rem auto",
            width: "min(160px, 50vw)",
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${GOLD_RING}, transparent)`,
          }}
        />
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: "clamp(0.6rem, 2.8vw, 0.85rem)",
            letterSpacing: "0.3em",
            color: "rgba(160,130,60,0.55)",
            textShadow: "0 1px 3px rgba(0,0,0,0.8)",
          }}
        >
          Forge Your Legend
        </div>
      </div>

      {/* Gold-bordered progress bar */}
      <div
        style={{
          width: "min(220px, 65vw)",
          height: "6px",
          borderRadius: "999px",
          border: "1px solid rgba(140,110,35,0.4)",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.6), 0 0 8px rgba(100,75,20,0.2)",
          background: EMBER_BG,
          position: "relative",
          overflow: "hidden",
          zIndex: 2,
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
            background: `linear-gradient(90deg, rgba(60,40,10,0.6), ${GOLD_WEATHERED} 70%, ${GOLD})`,
            boxShadow: "0 0 6px rgba(140,100,30,0.3)",
            transition: "width 0.08s linear",
          }}
        />
      </div>

      {/* Subtle caption */}
      <div
        style={{
          marginTop: "1rem",
          fontSize: "0.55rem",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "rgba(140,110,40,0.4)",
          position: "relative",
          zIndex: 2,
        }}
      >
        Forging your legend…
      </div>

      <style>{`
        @keyframes emberRise {
          0% {
            opacity: 0;
            transform: translateY(0) translateX(0) scale(1);
          }
          8% {
            opacity: 0.7;
          }
          50% {
            opacity: 0.4;
          }
          100% {
            opacity: 0;
            transform: translateY(-100vh) translateX(var(--drift, 0px)) scale(0.2);
          }
        }
      `}</style>
    </div>
  );
}

export default LoadingScreen;
