import { useEffect, useRef, useState } from "react";

/*
 * AETHORA loading/splash screen — dark fantasy grimdark aesthetic.
 * - Near-black background with deep charcoal/blood-red undertones
 * - Massive stone gate atmosphere (inspired by the reference image)
 * - Weathered gold title with embossed/carved-stone feel
 * - Sparse, muted embers instead of a bright star field
 * - Thin gold-bordered progress bar
 * - Calls onDone() when the animation completes so the parent can unmount it
 */

const GOLD = "#d4af37";
const GOLD_WEATHERED = "#b8962e";
const GOLD_RING = "rgba(180,150,50,0.7)";
const EMBER_BG = "rgba(8,5,3,0.6)";

export function LoadingScreen({ onDone }: { onDone?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);
  const frameRef = useRef<number | null>(null);
  const emberSeedRef = useRef<number[]>([]);

  useEffect(() => {
    if (emberSeedRef.current.length === 0) {
      const seed: number[] = [];
      // Sparse ember particles — only 18, not 80
      for (let i = 0; i < 18; i++) {
        seed.push(Math.random());
      }
      emberSeedRef.current = seed;
    }

    const start = performance.now();
    const DURATION_MS = 1800;

    const tick = (now: number) => {
      const elapsed = now - start;
      const raw = Math.min(elapsed / DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - raw, 2.2);
      setProgress(eased);
      if (raw < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        // Progress complete — start fade out, then dismiss
        setFading(true);
        setTimeout(() => {
          onDone?.();
        }, 600);
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
        background:
          "linear-gradient(180deg, #080503 0%, #0d0a07 30%, #100c08 60%, #0a0706 100%)",
        color: GOLD,
        overflow: "hidden",
        textAlign: "center",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.55s ease-out",
      }}
      role="status"
      aria-busy="true"
      aria-label="Loading the realm"
    >
      {/* Deep atmospheric fog / vignette layers */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 60%, rgba(40,20,8,0.3) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(60,30,10,0.15) 0%, transparent 50%)",
        }}
      />
      {/* Blood-red ember glow from below */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "40%",
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(80,25,5,0.12) 0%, transparent 65%)",
        }}
      />

      {/* Sparse floating embers — not a star field */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
        }}
      >
        {emberSeedRef.current.map((seed, i) => {
          const x = 15 + (i * 37 + 13) % 70;
          const y = 20 + (i * 53 + 7) % 60;
          const size = 1.5 + seed * 1.5;
          const delay = seed * 8;
          const duration = 5 + seed * 5;
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                width: size,
                height: size,
                background: i % 3 === 0 ? "#8b3a0a" : i % 3 === 1 ? "#6b2d08" : GOLD_WEATHERED,
                borderRadius: "50%",
                opacity: 0.2 + seed * 0.25,
                animation: `emberFloat ${duration}s ease-in-out ${delay}s infinite alternate`,
                filter: "blur(0.6px)",
                willChange: "opacity, transform",
              }}
            />
          );
        })}
      </div>

      {/* Stone gate silhouette lines — vertical columns flanking the title */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "12%",
          top: "15%",
          bottom: "15%",
          width: "1px",
          background:
            "linear-gradient(180deg, transparent, rgba(60,40,15,0.12) 30%, rgba(60,40,15,0.08) 70%, transparent)",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          right: "12%",
          top: "15%",
          bottom: "15%",
          width: "1px",
          background:
            "linear-gradient(180deg, transparent, rgba(60,40,15,0.12) 30%, rgba(60,40,15,0.08) 70%, transparent)",
        }}
      />

      {/* Title block — weathered carved-stone feel */}
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
            fontSize: "clamp(2.2rem, 11vw, 4rem)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: GOLD_WEATHERED,
            textShadow: [
              "0 1px 0 rgba(0,0,0,0.8)",
              "0 2px 4px rgba(0,0,0,0.6)",
              "0 0 30px rgba(140,100,30,0.15)",
              "inset 0 -1px 0 rgba(255,255,255,0.04)",
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
            color: "rgba(160,130,60,0.6)",
            textShadow: "0 1px 3px rgba(0,0,0,0.7)",
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
          border: `1px solid rgba(140,110,35,0.4)`,
          boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.6), 0 0 8px rgba(100,75,20,0.2)`,
          background: EMBER_BG,
          position: "relative",
          overflow: "hidden",
        }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        {/* progress fill */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, rgba(60,40,10,0.6), ${GOLD_WEATHERED} 70%, ${GOLD})`,
            boxShadow: `0 0 6px rgba(140,100,30,0.3)`,
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
          color: "rgba(140,110,40,0.45)",
        }}
      >
        Forging your legend…
      </div>

      <style>{`
        @keyframes emberFloat {
          0% {
            opacity: 0.1;
            transform: translateY(0) scale(0.9);
          }
          100% {
            opacity: 0.45;
            transform: translateY(-8px) scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}

export default LoadingScreen;
