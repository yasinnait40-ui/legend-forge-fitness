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

const VEILS = {
  soft: "bg-gradient-to-b from-background/50 via-background/30 to-background/85",
  normal: "bg-gradient-to-b from-background/60 via-background/40 to-background/90",
  strong: "bg-gradient-to-b from-background/75 via-background/55 to-background/95",
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
          className="h-full w-full object-cover"
          style={{ objectPosition: imagePosition }}
        />
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
