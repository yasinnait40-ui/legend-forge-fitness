// AETHORA — World Lore Framework
// Modular lore that can expand as the player progresses

export interface WorldLoreEntry {
  id: string;
  titleKey: string;
  contentKey: string;
  discoveryLevel: number; // Minimum level to discover this lore
  regionIds: string[]; // Which regions this lore relates to
}

export interface RegionLore {
  regionId: string;
  nameKey: string;
  historyKey: string;
  secretsKey: string;
  levelRevealed: number;
}

// Ancient History of Aethora
export const ANCIENT_HISTORY: WorldLoreEntry[] = [
  {
    id: "age-of-creation",
    titleKey: "lore.ageOfCreation.title",
    contentKey: "lore.ageOfCreation.content",
    discoveryLevel: 1,
    regionIds: ["valerion", "dawnshire"],
  },
  {
    id: "first-empire",
    titleKey: "lore.firstEmpire.title",
    contentKey: "lore.firstEmpire.content",
    discoveryLevel: 5,
    regionIds: ["valerion", "greendale", "westvale"],
  },
  {
    id: "the-great-weaving",
    titleKey: "lore.greatWeaving.title",
    contentKey: "lore.greatWeaving.content",
    discoveryLevel: 10,
    regionIds: ["silverpine-forest", "emberwood"],
  },
  {
    id: "the-blight-era",
    titleKey: "lore.blightEra.title",
    contentKey: "lore.blightEra.content",
    discoveryLevel: 15,
    regionIds: ["eldridge", "stoneward"],
  },
  {
    id: "reclamation",
    titleKey: "lore.reclamation.title",
    contentKey: "lore.reclamation.content",
    discoveryLevel: 20,
    regionIds: ["golden-fields", "shattered-waste"],
  },
];

// Factions of Aethora
export const FACTIONS: WorldLoreEntry[] = [
  {
    id: "order-of-eternity",
    titleKey: "lore.orderOfEternity.title",
    contentKey: "lore.orderOfEternity.content",
    discoveryLevel: 8,
    regionIds: ["stoneward", "frosthold"],
  },
  {
    id: "wanderers-guild",
    titleKey: "lore.wanderersGuild.title",
    contentKey: "lore.wanderersGuild.content",
    discoveryLevel: 3,
    regionIds: ["dawnshire", "sableport", "greendale"],
  },
  {
    id: "embercourt",
    titleKey: "lore.embercourt.title",
    contentKey: "lore.embercourt.content",
    discoveryLevel: 12,
    regionIds: ["emberwood"],
  },
];

// Mysterious Locations
export const MYSTERIES: WorldLoreEntry[] = [
  {
    id: "the-observatory",
    titleKey: "lore.observatory.title",
    contentKey: "lore.observatory.content",
    discoveryLevel: 10,
    regionIds: ["windscar-cliffs"],
  },
  {
    id: "the-silent-tower",
    titleKey: "lore.silentTower.title",
    contentKey: "lore.silentTower.content",
    discoveryLevel: 18,
    regionIds: ["eldridge"],
  },
  {
    id: "the-heart-stone",
    titleKey: "lore.heartStone.title",
    contentKey: "lore.heartStone.content",
    discoveryLevel: 25,
    regionIds: ["frosthold", "valerion"],
  },
];

// Character Relationships
export const CHARACTER_RELATIONS: Record<string, { relatedTo: string; loreKey: string }> = {
  king: { relatedTo: "valerion", loreKey: "lore.kingOfValerion" },
  adventurer: { relatedTo: "dawnshire", loreKey: "lore.adventurerOrigins" },
  scholar: { relatedTo: "silverpine-forest", loreKey: "lore.scholarResearch" },
  sage: { relatedTo: "windscar-cliffs", loreKey: "lore.sageWisdom" },
  hero: { relatedTo: "valerion", loreKey: "lore.heroDestiny" },
  hakari: { relatedTo: "emberwood", loreKey: "lore.hakariOrigin" },
  miri: { relatedTo: "silverpine-forest", loreKey: "lore.miriOrigin" },
};

// Helper to get lore available at current level
export function getLoreForLevel(level: number): WorldLoreEntry[] {
  return [...ANCIENT_HISTORY, ...FACTIONS, ...MYSTERIES].filter(
    (entry) => level >= entry.discoveryLevel,
  );
}

// Get lore related to a specific region
export function getLoreForRegion(regionId: string): WorldLoreEntry[] {
  return [...ANCIENT_HISTORY, ...FACTIONS, ...MYSTERIES].filter((entry) =>
    entry.regionIds.includes(regionId),
  );
}

// Check if a lore entry is unlocked
export function isLoreUnlocked(entry: WorldLoreEntry, level: number): boolean {
  return level >= entry.discoveryLevel;
}
