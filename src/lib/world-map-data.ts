// AETHORA — world map regions.
import { levelFromXp } from "./game-data";

export interface WorldRegion {
  id: string;
  name: string;
  description: string;
  levelReq: number;
  x: number; // position on the map, 0-100 (percentage)
  y: number;
  icon: "castle" | "forest" | "desert";
}

export const WORLD_REGIONS: WorldRegion[] = [
  {
    id: "kingdom",
    name: "The Kingdom",
    description: "Where every legend begins. Home of the King and the Keep.",
    levelReq: 1,
    x: 18,
    y: 68,
    icon: "castle",
  },
  {
    id: "enchanted-forest",
    name: "Enchanted Forest",
    description: "Ancient trees whisper old magic. The Wizard dwells here.",
    levelReq: 4,
    x: 50,
    y: 32,
    icon: "forest",
  },
  {
    id: "desert-of-ashes",
    name: "Desert of Ashes",
    description: "Scorched sands hide forgotten trials. Only the disciplined survive.",
    levelReq: 8,
    x: 82,
    y: 62,
    icon: "desert",
  },
];

export function isRegionUnlocked(region: WorldRegion, xp: number): boolean {
  return levelFromXp(xp) >= region.levelReq;
}