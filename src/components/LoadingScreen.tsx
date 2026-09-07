import { useEffect, useRef, useState } from "react";

/*
 * AETHORA loading/splash screen — dark fantasy grimdark aesthetic.
 * Pure CSS/SVG scene: massive stone gate, horned guardian statues,
 * torchlight, rising embers. No external image required.
 * Calls onDone() when complete so the parent can unmount it.
 */

const GOLD = "#d4af37";
const GOLD_WEATHERED = "#b8962e";
const GOLD_RING = "rgba(180,150,50,0.7)";

export function LoadingScreen({ onDone }: { onDone?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);
  const frameRef = useRef<number | null>(null);
  const emberSeedRef = useRef<Array<{ x: number; delay: number; duration: number; size: number; drift: number }>>([]);

  useEffect(() => {
    if (emberSeedRef.current.length === 0) {
      const seed: Array<{ x: number; delay: number; duration: number; size: number; drift: number }> = [];
      for (let i = 0; i < 30; i++) {
        const r = Math.random();
        seed.push({
          x: 5 + Math.random() * 90,
          delay: r * 7,
          duration: 3.5 + r * 5,
          size: 1 + r * 2.5,
          drift: (Math.random() - 0.5) * 40,
        });
      }
      emberSeedRef.current = seed;
    }

    const start = performance.now();
    const DURATION_MS = 2400;

    const tick = (now: number) => {
      const elapsed = now - start;
      const raw = Math.min(elapsed / DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - raw, 2.2);
      setProgress(eased);
      if (raw < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setFading(true);
        setTimeout(() => onDone?.(), 700);
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
      {/* ====== SCENE LAYERS ====== */}

      {/* Sky / storm clouds */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 15%, rgba(30,25,20,0.8) 0%, rgba(10,8,5,0.95) 60%, #060402 100%)",
        }}
      />

      {/* Moon glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "4%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(180,170,140,0.12) 0%, rgba(100,90,70,0.06) 40%, transparent 70%)",
        }}
      />

      {/* Stone gate SVG — massive archway with horned statues */}
      <svg
        viewBox="0 0 400 600"
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "420px",
          height: "auto",
          maxHeight: "85vh",
          filter: "drop-shadow(0 -4px 20px rgba(0,0,0,0.8))",
        }}
        aria-hidden="true"
      >
        <defs>
          {/* Stone texture gradient */}
          <linearGradient id="stoneGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1612" />
            <stop offset="40%" stopColor="#14110e" />
            <stop offset="100%" stopColor="#0a0806" />
          </linearGradient>
          {/* Torch glow */}
          <radialGradient id="torchGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(200,120,30,0.5)" />
            <stop offset="40%" stopColor="rgba(180,80,10,0.2)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          {/* Gate interior darkness */}
          <linearGradient id="gateDark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0806" />
            <stop offset="60%" stopColor="#050302" />
            <stop offset="100%" stopColor="#020101" />
          </linearGradient>
          {/* Light slit */}
          <linearGradient id="lightSlit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(200,180,120,0.6)" />
            <stop offset="50%" stopColor="rgba(220,200,140,0.3)" />
            <stop offset="100%" stopColor="rgba(180,160,100,0.05)" />
          </linearGradient>
        </defs>

        {/* Ground / steps */}
        <rect x="0" y="520" width="400" height="80" fill="#0a0806" />
        <rect x="60" y="510" width="280" height="15" rx="2" fill="#12100c" />
        <rect x="80" y="500" width="240" height="12" rx="2" fill="#151210" />
        <rect x="100" y="492" width="200" height="10" rx="2" fill="#181512" />

        {/* Left pillar */}
        <rect x="50" y="120" width="55" height="400" fill="url(#stoneGrad)" />
        <rect x="48" y="115" width="59" height="12" rx="2" fill="#1c1815" />
        <rect x="45" y="110" width="65" height="8" rx="2" fill="#201c18" />

        {/* Right pillar */}
        <rect x="295" y="120" width="55" height="400" fill="url(#stoneGrad)" />
        <rect x="293" y="115" width="59" height="12" rx="2" fill="#1c1815" />
        <rect x="290" y="110" width="65" height="8" rx="2" fill="#201c18" />

        {/* Archway */}
        <path
          d="M 105 280 Q 105 120 200 100 Q 295 120 295 280 L 295 520 L 105 520 Z"
          fill="url(#gateDark)"
          stroke="#1a1612"
          strokeWidth="3"
        />

        {/* Arch stone detail */}
        <path
          d="M 108 280 Q 108 125 200 105 Q 292 125 292 280"
          fill="none"
          stroke="#2a2420"
          strokeWidth="2"
        />
        <path
          d="M 112 280 Q 112 130 200 110 Q 288 130 288 280"
          fill="none"
          stroke="#1e1a16"
          strokeWidth="1.5"
        />

        {/* Keystone */}
        <polygon points="190,98 210,98 208,118 192,118" fill="#222018" />
        <polygon points="193,100 207,100 206,115 194,115" fill="#1a1814" />

        {/* Light slit through the gate crack */}
        <rect x="197" y="105" width="6" height="300" fill="url(#lightSlit)" opacity="0.6" />

        {/* Gate door carvings — left */}
        <rect x="115" y="300" width="75" height="220" rx="3" fill="#0d0b09" stroke="#1a1612" strokeWidth="1" />
        {/* Carved figures left */}
        <ellipse cx="152" cy="350" rx="12" ry="8" fill="#111" opacity="0.6" />
        <ellipse cx="140" cy="380" rx="10" ry="6" fill="#111" opacity="0.5" />
        <ellipse cx="165" cy="400" rx="14" ry="7" fill="#111" opacity="0.5" />
        <ellipse cx="148" cy="430" rx="11" ry="6" fill="#111" opacity="0.4" />
        <ellipse cx="158" cy="460" rx="13" ry="8" fill="#111" opacity="0.4" />

        {/* Gate door carvings — right */}
        <rect x="210" y="300" width="75" height="220" rx="3" fill="#0d0b09" stroke="#1a1612" strokeWidth="1" />
        {/* Carved figures right */}
        <ellipse cx="248" cy="350" rx="12" ry="8" fill="#111" opacity="0.6" />
        <ellipse cx="260" cy="380" rx="10" ry="6" fill="#111" opacity="0.5" />
        <ellipse cx="235" cy="400" rx="14" ry="7" fill="#111" opacity="0.5" />
        <ellipse cx="252" cy="430" rx="11" ry="6" fill="#111" opacity="0.4" />
        <ellipse cx="242" cy="460" rx="13" ry="8" fill="#111" opacity="0.4" />

        {/* LEFT HORNED DEMON STATUE */}
        <g transform="translate(30, 40)">
          {/* Body / torso */}
          <ellipse cx="50" cy="90" rx="22" ry="28" fill="#161310" />
          {/* Head */}
          <circle cx="50" cy="55" r="16" fill="#181512" />
          {/* Horns */}
          <path d="M 38 48 Q 28 20 22 10" stroke="#1e1a16" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M 62 48 Q 72 20 78 10" stroke="#1e1a16" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* Eyes — faint glow */}
          <circle cx="44" cy="53" r="2" fill="rgba(180,60,20,0.4)" />
          <circle cx="56" cy="53" r="2" fill="rgba(180,60,20,0.4)" />
          {/* Arms gripping pillar */}
          <path d="M 35 75 Q 20 85 18 110" stroke="#161310" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M 65 75 Q 80 85 82 110" stroke="#161310" strokeWidth="8" fill="none" strokeLinecap="round" />
          {/* Crouching legs */}
          <path d="M 35 110 Q 30 130 25 145" stroke="#161310" strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M 65 110 Q 70 130 75 145" stroke="#161310" strokeWidth="9" fill="none" strokeLinecap="round" />
        </g>

        {/* RIGHT HORNED DEMON STATUE */}
        <g transform="translate(290, 40)">
          <ellipse cx="50" cy="90" rx="22" ry="28" fill="#161310" />
          <circle cx="50" cy="55" r="16" fill="#181512" />
          <path d="M 38 48 Q 28 20 22 10" stroke="#1e1a16" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M 62 48 Q 72 20 78 10" stroke="#1e1a16" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="44" cy="53" r="2" fill="rgba(180,60,20,0.4)" />
          <circle cx="56" cy="53" r="2" fill="rgba(180,60,20,0.4)" />
          <path d="M 35 75 Q 20 85 18 110" stroke="#161310" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M 65 75 Q 80 85 82 110" stroke="#161310" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M 35 110 Q 30 130 25 145" stroke="#161310" strokeWidth="9" fill="none" strokeLinecap="round" />
          <path d="M 65 110 Q 70 130 75 145" stroke="#161310" strokeWidth="9" fill="none" strokeLinecap="round" />
        </g>

        {/* Torch flames — left */}
        <ellipse cx="55" cy="130" rx="8" ry="14" fill="rgba(200,100,20,0.35)" />
        <ellipse cx="55" cy="126" rx="5" ry="9" fill="rgba(220,140,40,0.5)" />
        <ellipse cx="55" cy="124" rx="2.5" ry="5" fill="rgba(255,200,80,0.6)" />
        {/* Torch glow */}
        <circle cx="55" cy="128" r="30" fill="url(#torchGlow)" opacity="0.7" />

        {/* Torch flames — right */}
        <ellipse cx="345" cy="130" rx="8" ry="14" fill="rgba(200,100,20,0.35)" />
        <ellipse cx="345" cy="126" rx="5" ry="9" fill="rgba(220,140,40,0.5)" />
        <ellipse cx="345" cy="124" rx="2.5" ry="5" fill="rgba(255,200,80,0.6)" />
        <circle cx="345" cy="128" r="30" fill="url(#torchGlow)" opacity="0.7" />

        {/* Red banners / tattered cloth on sides */}
        <path d="M 20 150 Q 15 200 22 250 Q 18 260 25 265" stroke="rgba(100,20,15,0.4)" strokeWidth="6" fill="none" />
        <path d="M 380 150 Q 385 200 378 250 Q 382 260 375 265" stroke="rgba(100,20,15,0.4)" strokeWidth="6" fill="none" />

        {/* Distant castle silhouette in background */}
        <rect x="140" y="60" width="12" height="50" fill="#0e0c0a" opacity="0.6" />
        <rect x="158" y="50" width="8" height="60" fill="#0e0c0a" opacity="0.5" />
        <rect x="172" y="65" width="10" height="45" fill="#0e0c0a" opacity="0.6" />
        <rect x="220" y="55" width="10" height="55" fill="#0e0c0a" opacity="0.5" />
        <rect x="238" y="45" width="14" height="65" fill="#0e0c0a" opacity="0.6" />
        <rect x="258" y="60" width="8" height="50" fill="#0e0c0a" opacity="0.5" />

        {/* Distant fires on horizon */}
        <circle cx="160" cy="95" r="3" fill="rgba(200,80,20,0.3)" />
        <circle cx="240" cy="90" r="2.5" fill="rgba(200,80,20,0.25)" />
        <circle cx="200" cy="100" r="2" fill="rgba(200,80,20,0.2)" />

        {/* Mist / fog at base */}
        <rect x="0" y="480" width="400" height="120" fill="url(#gateDark)" opacity="0.7" />
      </svg>

      {/* Atmospheric fog layers */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 25%, rgba(6,4,2,0.5) 65%, rgba(6,4,2,0.9) 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "40%",
          background:
            "linear-gradient(to top, rgba(6,4,2,0.95) 0%, rgba(20,12,5,0.3) 60%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Rising ember / fire-spark particles */}
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
            style={{
              position: "absolute",
              left: `${ember.x}%`,
              bottom: "-5%",
              width: ember.size,
              height: ember.size,
              borderRadius: "50%",
              background:
                i % 5 === 0
                  ? "#d4af37"
                  : i % 5 === 1
                    ? "#c47020"
                    : i % 5 === 2
                      ? "#8b3a0a"
                      : i % 5 === 3
                        ? "#e8a030"
                        : "#6b2d08",
              opacity: 0,
              // @ts-expect-error CSS custom property for per-particle drift
              ["--drift"]: `${ember.drift}px`,
              animation: `emberRise ${ember.duration}s ease-out ${ember.delay}s infinite`,
              filter: `blur(${0.2 + (i % 3) * 0.2}px)`,
              willChange: "transform, opacity",
            }}
          />
        ))}
      </div>

      {/* Title block */}
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
              "0 1px 0 rgba(0,0,0,0.95)",
              "0 2px 8px rgba(0,0,0,0.8)",
              "0 0 50px rgba(140,100,30,0.1)",
            ].join(", "),
          }}
        >
          AETHORA
        </div>
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
            color: "rgba(160,130,60,0.5)",
            textShadow: "0 1px 4px rgba(0,0,0,0.9)",
          }}
        >
          Forge Your Legend
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: "min(220px, 65vw)",
          height: "6px",
          borderRadius: "999px",
          border: "1px solid rgba(140,110,35,0.4)",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.6), 0 0 10px rgba(100,75,20,0.15)",
          background: "rgba(8,5,3,0.6)",
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
            boxShadow: "0 0 8px rgba(140,100,30,0.3)",
            transition: "width 0.08s linear",
          }}
        />
      </div>

      <div
        style={{
          marginTop: "1rem",
          fontSize: "0.55rem",
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          color: "rgba(140,110,40,0.35)",
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
            opacity: 0.65;
          }
          50% {
            opacity: 0.35;
          }
          100% {
            opacity: 0;
            transform: translateY(-100vh) translateX(var(--drift, 0px)) scale(0.15);
          }
        }
      `}</style>
    </div>
  );
}

export default LoadingScreen;
