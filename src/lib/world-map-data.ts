// AETHORA — world map regions, matched to the illustrated map.
import { levelFromXp } from "./game-data";

export interface WorldRegion {
  id: string;
  name: string;
  description: string;
  levelReq: number;
  x: number; // percentage of image width, 0-100
  y: number; // percentage of image height, 0-100
}

export const WORLD_REGIONS: WorldRegion[] = [
  {
    id: "valerion",
    name: "Valerion",
    description: "Crown of the Realms. Every legend begins in its shadow.",
    levelReq: 1,
    x: 47,
    y: 31,
  },
  {
    id: "dawnshire",
    name: "Dawnshire",
    description: "Quiet fields where the first trials are learned.",
    levelReq: 3,
    x: 48,
    y: 49,
  },
  {
    id: "greendale",
    name: "Greendale",
    description: "Rolling farmlands on the western road.",
    levelReq: 5,
    x: 25,
    y: 35,
  },
  {
    id: "westvale",
    name: "Westvale",
    description: "Windmills turn slow over ancient soil.",
    levelReq: 5,
    x: 22,
    y: 48,
  },
  {
    id: "silverpine-forest",
    name: "Silverpine Forest",
    description: "Tall pines hide old magic and older secrets.",
    levelReq: 8,
    x: 47,
    y: 19,
  },
  {
    id: "emberwood",
    name: "Emberwood",
    description: "A burning heart of woodland few dare enter.",
    levelReq: 10,
    x: 47,
    y: 60,
  },
  {
    id: "stoneward",
    name: "Stoneward",
    description: "Fortified watch over the eastern hills.",
    levelReq: 10,
    x: 70,
    y: 60,
  },
  {
    id: "windscar-cliffs",
    name: "Windscar Cliffs",
    description: "Wind-carved stone above a restless sea.",
    levelReq: 13,
    x: 70,
    y: 21,
  },
  {
    id: "eldridge",
    name: "Eldridge",
    description: "A dark spire keep few return from unscarred.",
    levelReq: 15,
    x: 50,
    y: 74,
  },
  {
    id: "golden-fields",
    name: "Golden Fields",
    description: "Endless wheat beneath an endless sky.",
    levelReq: 15,
    x: 70,
    y: 73,
  },
  {
    id: "misty-shores",
    name: "Misty Shores",
    description: "A coastal keep wrapped in perpetual fog.",
    levelReq: 17,
    x: 19,
    y: 62,
  },
  {
    id: "shattered-waste",
    name: "The Shattered Waste",
    description: "Broken lands where ruin swallowed the old world.",
    levelReq: 19,
    x: 22,
    y: 76,
  },
  {
    id: "sableport",
    name: "Sableport",
    description: "A harbor town where every road converges.",
    levelReq: 20,
    x: 47,
    y: 84,
  },
  {
    id: "sunhaven",
    name: "Sunhaven",
    description: "Warm gates opening onto the southern desert.",
    levelReq: 23,
    x: 47,
    y: 95,
  },
  {
    id: "tempest-isles",
    name: "Tempest Isles",
    description: "A lighthouse burns eternal against the storm.",
    levelReq: 25,
    x: 85,
    y: 90,
  },
  {
    id: "frosthold",
    name: "Frosthold",
    description: "A frozen citadel at the edge of the known realm.",
    levelReq: 27,
    x: 47,
    y: 7,
  },
];

export function isRegionUnlocked(region: WorldRegion, xp: number): boolean {
  return levelFromXp(xp) >= region.levelReq;
}