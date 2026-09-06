import type { CSSProperties } from "react";

declare module "react" {
  interface CSSProperties {
    "--boss-accent"?: string;
    "--zone-color"?: string;
  }
}
