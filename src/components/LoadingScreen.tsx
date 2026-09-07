import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

/*
 * AETHORA loading/splash screen.
 * replaces any default grey loading spacer with:
 * - deep navy-to-purple background (#1a1330 → #2d1b4e)
 * - gold "AETHORA" title (#d4af37)
 * - subtle animated star field
 * - thin gold-bordered progress bar
 */

const GOLD = "#d4af37";
const GOLD_RING = "rgba(212,175,55,0.85)";
const BAR_BG = "rgba(10,7,22,0.55)";

export function LoadingScreen({ className }: { className?: string }) {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);
  const starSeedRef = useRef<number[]>([]);

  useEffect(() => {
    if (starSeedRef.current.length === 0) {
      const seed: number[] = [];
      for (let i = 0; i < 80; i++) {
        seed.push(Math.random());
      }
      starSeedRef.current = seed;
    }

    const start = performance.now();
    const DURATION_MS = 1400;

    const tick = (now: number) => {
      const elapsed = now - start;
      const raw = Math.min(elapsed / DURATION_MS, 1);
      // ease-out so the bar rushes ahead then settles
      const eased = 1 - Math.pow(1 - raw, 2.2);
      setProgress(eased);
      if (raw < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #1a1330 0%, #2d1b4e 100%)",
        color: GOLD,
        overflow: "hidden",
        textAlign: "center",
      }}
      role="status"
      aria-busy="true"
      aria-label="Loading the realm"
    >
      {/* Star field */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
        }}
      >
        {starSeedRef.current.map((seed, i) => {
          const x = (i * 37 + 13) % 100;
          const y = (i * 53 + 7) % 100;
          const size = 1 + (seed * 1.6);
          const delay = seed * 6;
          const duration = 3 + seed * 3;
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                width: size,
                height: size,
                background: GOLD,
                borderRadius: "50%",
                opacity: 0.15 + seed * 0.35,
                animation: `starTwinkle ${duration}s ease-in-out ${delay}s infinite alternate`,
                filter: "blur(0.4px)",
                willChange: "opacity",
              }}
            />
          );
        })}
      </div>

      {/* Title block */}
      <div
        style={{
          position: "relative",
          marginBottom: "2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontWeight: 700,
            fontSize: "clamp(2.4rem, 12vw, 4.4rem)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: GOLD,
            textShadow:
              "0 0 18px rgba(212,175,55,0.5), 0 2px 0 rgba(0,0,0,0.5)",
          }}
        >
          AETHORA
        </div>
        <div
          style={{
            marginTop: "0.4rem",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: "clamp(0.7rem, 3vw, 1rem)",
            letterSpacing: "0.32em",
            color: GOLD_RING,
            opacity: 0.85,
            textShadow: "0 1px 2px rgba(0,0,0,0.6)",
          }}
        >
          — Realms of Balance —
        </div>
      </div>

      {/* Gold-bordered progress bar */}
      <div
        style={{
          width: "min(240px, 70vw)",
          height: "8px",
          borderRadius: "999px",
          border: `1px solid ${GOLD_RING}`,
          boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.5), 0 0 14px ${GOLD_RING}`,
          background: BAR_BG,
          position: "relative",
          overflow: "hidden",
        }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        {/* center gold vignette */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, transparent 72%)",
          }}
        />
        {/* progress fill */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            background:
              `linear-gradient(90deg, rgba(0,0,0,0.45), ${GOLD} 60%, ${GOLD_RING})`,
            boxShadow: `0 0 12px ${GOLD_RING}`,
            transition: "width 0.08s linear",
          }}
        />
      </div>

      {/* subtle caption */}
      <div
        style={{
          marginTop: "1.1rem",
          fontSize: "0.62rem",
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: GOLD_RING,
          opacity: 0.7,
        }}
      >
        Forging your legend…
      </div>

      <style>{`
        @keyframes starTwinkle {
          0% {
            opacity: 0.12;
            transform: scale(0.8);
          }
          100% {
            opacity: 0.9;
            transform: scale(1.15);
          }
        }
      `}</style>
    </div>
  );
}

export default LoadingScreen;
