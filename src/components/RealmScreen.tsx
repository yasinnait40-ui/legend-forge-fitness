import type { ReactNode } from "react";
import { Particles } from "./Particles";

interface RealmScreenProps {
  image: string;
  alt: string;
  children: ReactNode;
  /** object-position for cinematic cropping on narrow screens */
  imagePosition?: string;
  embers?: boolean;
  veil?: "soft" | "normal" | "strong";
  eager?: boolean;
}

/**
 * Bright, airy veils: the artwork stays luminous while panels and text
 * remain readable on top of it. Layers tint the scene with warm ivory.
 */
const VEILS = {
  soft: "bg-gradient-to-b from-white/25 via-white/10 to-background/60",
  normal: "bg-gradient-to-b from-white/35 via-white/15 to-background/75",
  strong: "bg-gradient-to-b from-white/45 via-white/25 to-background/85",
} as const;

/**
 * A full-screen fantasy environment: fixed atmospheric artwork behind
 * scrollable semi-transparent UI. The artwork is never covered by opaque panels.
 */
export function RealmScreen({
  image,
  alt,
  children,
  imagePosition = "center",
  embers = true,
  veil = "normal",
  eager = false,
}: RealmScreenProps) {
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div className="fixed inset-0 -z-10">
        <img
          src={image}
          alt={alt}
          width={1024}
          height={1536}
          loading={eager ? "eager" : "lazy"}
          className="h-full w-full object-cover brightness-[1.08] saturate-[1.06]"
          style={{ objectPosition: imagePosition }}
        />
        {/* Warm sunlit wash so every scene reads as golden-hour, never gloomy */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/12 via-transparent to-secondary/25 mix-blend-soft-light" />
        <div className={`absolute inset-0 ${VEILS[veil]}`} />
      </div>
      {embers && (
        <div className="pointer-events-none fixed inset-0 z-0">
          <Particles />
        </div>
      )}
      <div className="relative z-10 mx-auto w-full max-w-lg px-4 pb-32">{children}</div>
    </div>
  );
}
