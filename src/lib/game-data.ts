// AETHORA — world data: stats, levels, quests, trials, achievements, equipment.

export type StatKey = "strength" | "endurance" | "agility" | "vitality" | "recovery";

export const STAT_ORDER: StatKey[] = ["strength", "endurance", "agility", "vitality", "recovery"];

export const STAT_LABELS: Record<StatKey, string> = {
  strength: "Strength",
  endurance: "Endurance",
  agility: "Agility",
  vitality: "Vitality",
  recovery: "Recovery",
};

export const STAT_CAP = 99;

/* ---------------- Levels & titles ---------------- */

/** Cumulative XP required to BE the given level. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * (level - 1) * level;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function levelProgress(xp: number): {
  level: number;
  intoLevel: number;
  needed: number;
  ratio: number;
} {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const needed = next - floor;
  return { level, intoLevel: xp - floor, needed, ratio: needed > 0 ? (xp - floor) / needed : 0 };
}

export const TITLES: { min: number; title: string }[] = [
  { min: 30, title: "Eternal Legend" },
  { min: 25, title: "Mythic Sovereign" },
  { min: 20, title: "Dragonheart" },
  { min: 16, title: "Storm Warden" },
  { min: 13, title: "Rune Knight" },
  { min: 10, title: "Arcane Warrior" },
  { min: 8, title: "Blade Adept" },
  { min: 5, title: "Squire of the Keep" },
  { min: 3, title: "Ember Initiate" },
  { min: 1, title: "Wanderer of the Wilds" },
];

export function titleForLevel(level: number): string {
  for (const t of TITLES) if (level >= t.min) return t.title;
  return TITLES[TITLES.length - 1]?.title ?? "Wanderer of the Wilds";
}

/* ---------------- Daily quests ---------------- */

export interface Quest {
  id: string;
  name: string;
  description: string;
  xp: number;
  stats: Partial<Record<StatKey, number>>;
  icon: string;
  auto?: string;
}

export const QUESTS: Quest[] = [
  {
    id: "trial-of-strength",
    name: "Trial of Strength",
    description: "Complete 30 push-ups before the day ends.",
    xp: 50,
    stats: { strength: 6 },
    icon: "dumbbell",
  },
  {
    id: "path-of-endurance",
    name: "Path of Endurance",
    description: "Walk or run 3 km beneath the open sky.",
    xp: 80,
    stats: { endurance: 8 },
    icon: "footprints",
  },
  {
    id: "guardians-discipline",
    name: "Guardian's Discipline",
    description: "Complete today's training trial.",
    xp: 100,
    stats: { vitality: 4 },
    icon: "shield",
    auto: "Seals itself when you conquer any trial.",
  },
  {
    id: "breath-of-the-forest",
    name: "Breath of the Forest",
    description: "10 minutes of stretching or mobility work.",
    xp: 40,
    stats: { recovery: 5 },
    icon: "tree",
  },
  {
    id: "shadow-swiftness",
    name: "Shadow's Swiftness",
    description: "50 jumping jacks or 10 minutes of agility drills.",
    xp: 60,
    stats: { agility: 6 },
    icon: "wind",
  },
  {
    id: "feast-of-the-keep",
    name: "Feast of the Keep",
    description: "Eat a protein-rich meal and drink 2 L of water.",
    xp: 45,
    stats: { vitality: 5 },
    icon: "apple",
  },
];

/* ---------------- Training trials (workouts) ---------------- */

export interface TrialExercise {
  name: string;
  sets: string;
}

export interface Trial {
  id: string;
  name: string;
  epithet: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  minutes: number;
  xp: number;
  stats: Partial<Record<StatKey, number>>;
  exercises: TrialExercise[];
}

export const TRIALS: Trial[] = [
  {
    id: "iron-chest",
    name: "Trial of the Iron Chest",
    epithet: "Forge the bulwark of the upper body",
    difficulty: 3,
    minutes: 25,
    xp: 120,
    stats: { strength: 10, endurance: 3 },
    exercises: [
      { name: "Bench Press (or floor press)", sets: "4 × 12" },
      { name: "Push-ups", sets: "4 × 15" },
      { name: "Incline Dumbbell Press", sets: "3 × 12" },
      { name: "Chest Fly", sets: "3 × 15" },
    ],
  },
  {
    id: "ember-core",
    name: "Ember Core Rite",
    epithet: "Kindle the fire at your center",
    difficulty: 2,
    minutes: 15,
    xp: 90,
    stats: { strength: 4, vitality: 5 },
    exercises: [
      { name: "Plank", sets: "3 × 60 s" },
      { name: "Crunches", sets: "3 × 20" },
      { name: "Russian Twists", sets: "3 × 20" },
      { name: "Leg Raises", sets: "3 × 12" },
    ],
  },
  {
    id: "wardens-keep",
    name: "Warden's Lower Keep",
    epithet: "Build foundations of stone",
    difficulty: 4,
    minutes: 30,
    xp: 150,
    stats: { strength: 12, agility: 4 },
    exercises: [
      { name: "Squats", sets: "4 × 15" },
      { name: "Walking Lunges", sets: "3 × 12 / leg" },
      { name: "Glute Bridge", sets: "3 × 15" },
      { name: "Calf Raises", sets: "4 × 20" },
      { name: "Wall Sit", sets: "3 × 45 s" },
    ],
  },
  {
    id: "stormwind-run",
    name: "Stormwind Run",
    epithet: "Outrun the gathering storm",
    difficulty: 2,
    minutes: 20,
    xp: 110,
    stats: { endurance: 10, agility: 3 },
    exercises: [
      { name: "Warm-up jog", sets: "5 min" },
      { name: "Fast intervals", sets: "8 × 1 min" },
      { name: "Recovery walk", sets: "1 min between intervals" },
      { name: "Cool-down walk", sets: "4 min" },
    ],
  },
  {
    id: "nightblade-mobility",
    name: "Nightblade Mobility",
    epithet: "Move as silently as shadow",
    difficulty: 1,
    minutes: 12,
    xp: 60,
    stats: { recovery: 8, agility: 3 },
    exercises: [
      { name: "World's Greatest Stretch", sets: "3 / side" },
      { name: "Deep Squat Hold", sets: "3 × 30 s" },
      { name: "Cat-Cow", sets: "2 × 10" },
      { name: "Shoulder Opener", sets: "2 × 40 s" },
    ],
  },
  {
    id: "dragon-slayer",
    name: "Dragon Slayer's Gauntlet",
    epithet: "Only legends finish this rite",
    difficulty: 5,
    minutes: 40,
    xp: 220,
    stats: { strength: 14, endurance: 10, vitality: 6 },
    exercises: [
      { name: "Burpees", sets: "4 × 12" },
      { name: "Pull-ups (or rows)", sets: "4 × 8" },
      { name: "Goblet Squats", sets: "4 × 15" },
      { name: "Push-ups", sets: "4 × 20" },
      { name: "Mountain Climbers", sets: "4 × 40" },
      { name: "Plank", sets: "3 × 60 s" },
    ],
  },
];

/* ---------------- Boss battles (pure gamification) ---------------- */

export interface Boss {
  id: string;
  name: string;
  epithet: string;
  hp: number;
  /** HP removed from the boss per conquered trial. Abstract game damage only. */
  damagePerTrial: number;
  /** Which trial id, when conquered, is themed as the finishing blow. */
  finishingTrialId: string;
}

export const IRON_GOLEM: Boss = {
  id: "iron-golem",
  name: "The Iron Golem",
  epithet: "An ancient sentinel of stone blocks the mountain pass.",
  hp: 100,
  damagePerTrial: 10,
  finishingTrialId: "wardens-keep",
};

/** Current boss HP for a game state (abstract, gamified — never a health metric). */
export function bossHpRemaining(boss: Boss, trialsEver: string[]): number {
  const damage = trialsEver.length * boss.damagePerTrial;
  return Math.max(0, boss.hp - damage);
}

export function bossDefeated(boss: Boss, trialsEver: string[]): boolean {
  return bossHpRemaining(boss, trialsEver) <= 0;
}

/* ---------------- Achievements ---------------- */

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const RARITY_LABELS: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export interface AchievementContext {
  xp: number;
  streak: number;
  totalQuests: number;
  totalTrials: number;
  trialsEver: string[];
  stats: Record<StatKey, number>;
}

export interface Achievement {
  id: string;
  name: string;
  flavor: string;
  rarity: Rarity;
  icon: string;
  test: (ctx: AchievementContext) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-quest",
    name: "First Quest",
    flavor: "Answer the guild's call for the first time.",
    rarity: "common",
    icon: "scroll",
    test: (c) => c.totalQuests >= 1,
  },
  {
    id: "first-trial",
    name: "Blood of the Arena",
    flavor: "Conquer your first training trial.",
    rarity: "common",
    icon: "swords",
    test: (c) => c.totalTrials >= 1,
  },
  {
    id: "rune-awakened",
    name: "Rune Awakened",
    flavor: "Reach Level 5.",
    rarity: "uncommon",
    icon: "sparkles",
    test: (c) => levelFromXp(c.xp) >= 5,
  },
  {
    id: "seven-day-flame",
    name: "Seven-Day Flame",
    flavor: "Hold a 7-day streak without breaking.",
    rarity: "uncommon",
    icon: "flame",
    test: (c) => c.streak >= 7,
  },
  {
    id: "night-runner",
    name: "Night Runner",
    flavor: "Raise Endurance to 40.",
    rarity: "rare",
    icon: "moon",
    test: (c) => c.stats.endurance >= 40,
  },
  {
    id: "iron-will",
    name: "Iron Will",
    flavor: "Conquer 10 training trials.",
    rarity: "rare",
    icon: "shield",
    test: (c) => c.totalTrials >= 10,
  },
  {
    id: "dragon-slayer",
    name: "Dragon Slayer",
    flavor: "Survive the Dragon Slayer's Gauntlet.",
    rarity: "epic",
    icon: "sword",
    test: (c) => c.trialsEver.includes("dragon-slayer"),
  },
  {
    id: "stormheart",
    name: "Stormheart",
    flavor: "Hold a 14-day streak.",
    rarity: "epic",
    icon: "zap",
    test: (c) => c.streak >= 14,
  },
  {
    id: "legendary-discipline",
    name: "Legendary Discipline",
    flavor: "Reach Level 20.",
    rarity: "legendary",
    icon: "crown",
    test: (c) => levelFromXp(c.xp) >= 20,
  },
  {
    id: "titan-physique",
    name: "Titan's Physique",
    flavor: "Raise Strength to 60.",
    rarity: "legendary",
    icon: "gem",
    test: (c) => c.stats.strength >= 60,
  },
  {
    id: "first-blood",
    name: "First Blood",
    flavor: "Take up the mantle — complete your first deed.",
    rarity: "common",
    icon: "swords",
    test: (c) => c.totalQuests + c.totalTrials >= 1,
  },
  {
    id: "unbroken",
    name: "Unbroken",
    flavor: "Hold a 30-day streak without faltering.",
    rarity: "legendary",
    icon: "crown",
    test: (c) => c.streak >= 30,
  },
  {
    id: "golem-bane",
    name: "Golem Bane",
    flavor: "Fell the Iron Golem through ten mighty trials.",
    rarity: "epic",
    icon: "shield",
    test: (c) => c.trialsEver.length >= 10,
  },
];

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/* ---------------- Equipment (cosmetic) ---------------- */

export type EquipSlot = "weapon" | "armor" | "relic";

export const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon: "Weapon",
  armor: "Armor",
  relic: "Relic",
};

export interface EquipmentItem {
  id: string;
  slot: EquipSlot;
  name: string;
  flavor: string;
  levelReq: number;
  icon: string;
}

export const EQUIPMENT: EquipmentItem[] = [
  // Weapons
  {
    id: "worn-iron-blade",
    slot: "weapon",
    name: "Worn Iron Blade",
    flavor: "Every legend begins with humble steel.",
    levelReq: 1,
    icon: "sword",
  },
  {
    id: "emberforged-sword",
    slot: "weapon",
    name: "Emberforged Sword",
    flavor: "Quenched in dragonfire, warm to the touch.",
    levelReq: 5,
    icon: "flame-sword",
  },
  {
    id: "moonlit-runesaber",
    slot: "weapon",
    name: "Moonlit Runesaber",
    flavor: "Its runes glow beneath a full moon.",
    levelReq: 10,
    icon: "moon-sword",
  },
  {
    id: "dragonfang-greatblade",
    slot: "weapon",
    name: "Dragonfang Greatblade",
    flavor: "Carved from the fang of Vharos the Ashwing.",
    levelReq: 18,
    icon: "swords",
  },
  // Armor
  {
    id: "travelers-garb",
    slot: "armor",
    name: "Traveler's Garb",
    flavor: "Dusty, patched, and dependable.",
    levelReq: 1,
    icon: "shirt",
  },
  {
    id: "squires-plate",
    slot: "armor",
    name: "Squire's Plate",
    flavor: "First true armor of the Keep.",
    levelReq: 4,
    icon: "shield",
  },
  {
    id: "runebound-aegis",
    slot: "armor",
    name: "Runebound Aegis",
    flavor: "Wards hum softly across the plates.",
    levelReq: 12,
    icon: "shield-glow",
  },
  {
    id: "celestial-warplate",
    slot: "armor",
    name: "Celestial Warplate",
    flavor: "Forged from a fallen star's heart.",
    levelReq: 22,
    icon: "star-shield",
  },
  // Relics
  {
    id: "cracked-mana-stone",
    slot: "relic",
    name: "Cracked Mana Stone",
    flavor: "It still hums with faint power.",
    levelReq: 1,
    icon: "gem",
  },
  {
    id: "whispering-amulet",
    slot: "relic",
    name: "Whispering Amulet",
    flavor: "It murmurs advice only you can hear.",
    levelReq: 6,
    icon: "amulet",
  },
  {
    id: "eye-of-the-observatory",
    slot: "relic",
    name: "Eye of the Observatory",
    flavor: "Sees the path before you walk it.",
    levelReq: 14,
    icon: "eye",
  },
  {
    id: "heart-of-aethora",
    slot: "relic",
    name: "Heart of Aethora",
    flavor: "The realm's own pulse, carried in your palm.",
    levelReq: 25,
    icon: "heart",
  },
];

export function itemById(id: string): EquipmentItem | undefined {
  return EQUIPMENT.find((i) => i.id === id);
}
