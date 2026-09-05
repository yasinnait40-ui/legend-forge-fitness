// AETHORA — world map regions, matched to the illustrated map.
// P1.3: regions are a real progression system. Each region carries its own
// difficulty tier, concise lore, connections to existing quests/trials, and a
// narrating character. Region states derive from the authoritative game state.
import { levelFromXp, type AchievementContext } from "./game-data";

export type RegionState = "locked" | "available" | "discovered" | "mastered";

export type RegionNarrator = "king" | "adventurer" | "scholar" | "sage";

export interface WorldRegion {
  id: string;
  name: string;
  description: string;
  levelReq: number;
  x: number; // percentage of image width, 0-100
  y: number; // percentage of image height, 0-100
  /** Difficulty tier 1-5 — mirrors trial difficulty scales. */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** One-line atmospheric lore shown in the region panel. */
  lore: string;
  /** Which character introduces this region. */
  narrator: RegionNarrator;
  /** Existing quest ids associated with this region (thematic grouping). */
  questIds: string[];
  /** Existing trial ids associated with this region. Conquering all of them masters the region. */
  trialIds: string[];
}

export const WORLD_REGIONS: WorldRegion[] = [
  {
    id: "valerion",
    name: "Valerion",
    description: "Crown of the Realms. Every legend begins in its shadow.",
    levelReq: 1,
    x: 47,
    y: 31,
    difficulty: 1,
    lore: "The first shelter of every adventurer. Beyond its gates lies a realm that rewards those who refuse to remain ordinary.",
    narrator: "king",
    questIds: ["trial-of-strength", "feast-of-the-keep"],
    trialIds: ["ember-core", "nightblade-mobility"],
  },
  {
    id: "dawnshire",
    name: "Dawnshire",
    description: "Quiet fields where the first trials are learned.",
    levelReq: 3,
    x: 48,
    y: 49,
    difficulty: 1,
    lore: "Where the morning mist teaches patience, and the first roads test the traveler's stride.",
    narrator: "adventurer",
    questIds: ["breath-of-the-forest"],
    trialIds: ["stormwind-run"],
  },
  {
    id: "greendale",
    name: "Greendale",
    description: "Rolling farmlands on the western road.",
    levelReq: 5,
    x: 25,
    y: 35,
    difficulty: 2,
    lore: "The farmers here measure strength the honest way — by what the body can carry, day after day.",
    narrator: "scholar",
    questIds: ["shadow-swiftness"],
    trialIds: ["iron-chest"],
  },
  {
    id: "westvale",
    name: "Westvale",
    description: "Windmills turn slow over ancient soil.",
    levelReq: 5,
    x: 22,
    y: 48,
    difficulty: 2,
    lore: "The western road asks one question a thousand times: will you take the next step?",
    narrator: "adventurer",
    questIds: ["path-of-endurance"],
    trialIds: [],
  },
  {
    id: "silverpine-forest",
    name: "Silverpine Forest",
    description: "Tall pines hide old magic and older secrets.",
    levelReq: 8,
    x: 47,
    y: 19,
    difficulty: 2,
    lore: "The pines remember every traveler who passed beneath them. Move quietly, and they will teach you their rhythm.",
    narrator: "sage",
    questIds: ["breath-of-the-forest"],
    trialIds: ["nightblade-mobility"],
  },
  {
    id: "emberwood",
    name: "Emberwood",
    description: "A burning heart of woodland few dare enter.",
    levelReq: 10,
    x: 47,
    y: 60,
    difficulty: 3,
    lore: "The forest does not burn. It breathes fire — and so must those who walk it.",
    narrator: "scholar",
    questIds: ["trial-of-strength"],
    trialIds: ["ember-core"],
  },
  {
    id: "stoneward",
    name: "Stoneward",
    description: "Fortified watch over the eastern hills.",
    levelReq: 10,
    x: 70,
    y: 60,
    difficulty: 3,
    lore: "The wardens hold the wall through discipline alone. Their watchword: strength is a habit, not an act.",
    narrator: "king",
    questIds: ["trial-of-strength"],
    trialIds: ["iron-chest"],
  },
  {
    id: "windscar-cliffs",
    name: "Windscar Cliffs",
    description: "Wind-carved stone above a restless sea.",
    levelReq: 13,
    x: 70,
    y: 21,
    difficulty: 3,
    lore: "The wind writes its trials on the stone. Only those who keep moving learn to read them.",
    narrator: "sage",
    questIds: ["shadow-swiftness"],
    trialIds: ["stormwind-run"],
  },
  {
    id: "eldridge",
    name: "Eldridge",
    description: "A dark spire keep few return from unscarred.",
    levelReq: 15,
    x: 50,
    y: 74,
    difficulty: 4,
    lore: "The spire keeps no prisoners and no excuses. What you bring back from it is only ever yourself — changed.",
    narrator: "sage",
    questIds: ["trial-of-strength", "shadow-swiftness"],
    trialIds: ["wardens-keep"],
  },
  {
    id: "golden-fields",
    name: "Golden Fields",
    description: "Endless wheat beneath an endless sky.",
    levelReq: 15,
    x: 70,
    y: 73,
    difficulty: 4,
    lore: "The harvest rewards those who return every single day. The fields know a streak when they see one.",
    narrator: "scholar",
    questIds: ["feast-of-the-keep", "breath-of-the-forest"],
    trialIds: [],
  },
  {
    id: "misty-shores",
    name: "Misty Shores",
    description: "A coastal keep wrapped in perpetual fog.",
    levelReq: 17,
    x: 19,
    y: 62,
    difficulty: 4,
    lore: "Here the sea repeats one lesson in every wave: endurance is not speed. It is refusal to stop.",
    narrator: "adventurer",
    questIds: ["path-of-endurance"],
    trialIds: ["stormwind-run"],
  },
  {
    id: "shattered-waste",
    name: "The Shattered Waste",
    description: "Broken lands where ruin swallowed the old world.",
    levelReq: 19,
    x: 22,
    y: 76,
    difficulty: 4,
    lore: "The old world broke here. What grows in the cracks is hardier than what stood before.",
    narrator: "sage",
    questIds: ["trial-of-strength"],
    trialIds: ["dragon-slayer"],
  },
  {
    id: "sableport",
    name: "Sableport",
    description: "A harbor town where every road converges.",
    levelReq: 20,
    x: 47,
    y: 84,
    difficulty: 4,
    lore: "Every legend passes through Sableport eventually. The harbor only asks that you arrive carrying more than you left with.",
    narrator: "king",
    questIds: ["feast-of-the-keep", "path-of-endurance"],
    trialIds: ["iron-chest", "ember-core"],
  },
  {
    id: "sunhaven",
    name: "Sunhaven",
    description: "Warm gates opening onto the southern desert.",
    levelReq: 23,
    x: 47,
    y: 95,
    difficulty: 5,
    lore: "The desert gives nothing to those who negotiate with it. It gives everything to those who simply keep walking.",
    narrator: "scholar",
    questIds: ["path-of-endurance"],
    trialIds: ["wardens-keep"],
  },
  {
    id: "tempest-isles",
    name: "Tempest Isles",
    description: "A lighthouse burns eternal against the storm.",
    levelReq: 25,
    x: 85,
    y: 90,
    difficulty: 5,
    lore: "The light has survived ten thousand storms by burning, not by hiding. Guard your flame the same way.",
    narrator: "sage",
    questIds: ["breath-of-the-forest"],
    trialIds: ["dragon-slayer", "stormwind-run"],
  },
  {
    id: "frosthold",
    name: "Frosthold",
    description: "A frozen citadel at the edge of the known realm.",
    levelReq: 27,
    x: 47,
    y: 7,
    difficulty: 5,
    lore: "The cold asks a single question of every challenger: even now? The answer is always the same. Even now.",
    narrator: "king",
    questIds: ["trial-of-strength", "path-of-endurance"],
    trialIds: ["dragon-slayer", "wardens-keep"],
  },
];

export function isRegionUnlocked(region: WorldRegion, xp: number): boolean {
  return levelFromXp(xp) >= region.levelReq;
}

/**
 * Resolve the full region state from the authoritative game state.
 *  locked     — level below the requirement (fogged on the map)
 *  available  — level reached but not yet visited (shows "NEW" on the map)
 *  discovered — the player has entered/claimed the region
 *  mastered   — every trial tied to the region has been conquered at least once
 */
export function regionState(
  region: WorldRegion,
  xp: number,
  discoveredRegions: readonly string[],
  trialsEver: readonly string[],
): RegionState {
  if (!isRegionUnlocked(region, xp)) return "locked";
  if (!discoveredRegions.includes(region.id)) return "available";
  const mastered =
    region.trialIds.length > 0 && region.trialIds.every((t) => trialsEver.includes(t));
  return mastered ? "mastered" : "discovered";
}

/** Mastery progress (0..1) for a discovered region, based on real trial history. */
export function regionMasteryProgress(region: WorldRegion, trialsEver: readonly string[]): number {
  if (region.trialIds.length === 0) return 0;
  const done = region.trialIds.filter((t) => trialsEver.includes(t)).length;
  return done / region.trialIds.length;
}

/** Regions the player can currently enter but has not discovered yet. */
export function undiscoveredRegions(
  xp: number,
  discoveredRegions: readonly string[],
): WorldRegion[] {
  return WORLD_REGIONS.filter((r) => isRegionUnlocked(r, xp) && !discoveredRegions.includes(r.id));
}

/** Context shape shared with the achievement engine for region conditions. */
export interface RegionAchievementContext extends Omit<AchievementContext, "discoveredRegions"> {
  discoveredRegions: string[];
}
