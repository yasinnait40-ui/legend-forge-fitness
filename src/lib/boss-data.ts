import ashenWolfImg from "@/assets/boss-ashen-wolf.png";
import hollowKnightImg from "@/assets/boss-hollow-knight.png";
import frostWyrmImg from "@/assets/boss-frost-wyrm.png";

export interface Boss {
  id: string;
  name: string;
  epithet: string;
  regionId: string; // matches WorldRegion.id in world-map-data.ts
  maxHp: number;
  image: string;
  /** Per-boss accent hue so each foe has its own color identity on the battlefield. */
  accentHue: number;
}

export const BOSSES: Boss[] = [
  {
    id: "ashen-wolf",
    name: "The Ashen Wolf",
    epithet: "Its howl still echoes through the burning trees.",
    regionId: "emberwood",
    maxHp: 300,
    image: ashenWolfImg,
    accentHue: 28,
  },
  {
    id: "hollow-knight",
    name: "The Hollow Knight",
    epithet: "An armor with no soul left to guard.",
    regionId: "eldridge",
    maxHp: 500,
    image: hollowKnightImg,
    accentHue: 270,
  },
  {
    id: "frost-wyrm",
    name: "The Frost Wyrm",
    epithet: "The realm's oldest cold, given breath.",
    regionId: "frosthold",
    maxHp: 800,
    image: frostWyrmImg,
    accentHue: 205,
  },
];

export function bossByRegion(regionId: string): Boss | undefined {
  return BOSSES.find((b) => b.regionId === regionId);
}

export function bossById(id: string): Boss | undefined {
  return BOSSES.find((b) => b.id === id);
}
