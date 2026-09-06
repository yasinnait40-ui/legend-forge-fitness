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
 * Atmospheric veils over the fantasy artwork. Tints the scene with
 * the active theme surface so panels and text stay readable regardless
 * of the route.
 */
const VEILS = {
  soft: "bg-gradient-to-b from-background/25 via-background/10 to-background/60",
  normal: "bg-gradient-to-b from-background/35 via-background/15 to-background/75",
  strong: "bg-gradient-to-b from-background/45 via-background/25 to-background/85",
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
        {/* Warm atmospheric wash over the scene, tinted by the active theme */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-secondary/20 mix-blend-soft-light" />
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
