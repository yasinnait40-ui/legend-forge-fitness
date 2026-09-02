import type { TFunction } from "i18next";
import type { GameState } from "./game-store";
import { levelFromXp } from "./game-data";

export type CharacterId = "king" | "adventurer" | "scholar" | "sage" | "hero" | "hakari" | "miri";
export type CharacterScreen = "home" | "quests" | "trials" | "guide" | "character" | "legend";

export interface CharacterDefinition {
  id: CharacterId;
  nameKey: string;
  roleKey: string;
  screen: CharacterScreen;
  artwork: { src: string; altKey: string };
  accent: string;
  dialogueKeys: {
    default: string;
    newPlayer: string;
    levelUp: string;
    streak: string;
    progress: string;
  };
}

export const CHARACTERS: Record<CharacterId, CharacterDefinition> = {
  king: {
    id: "king",
    nameKey: "characters.roster.king.name",
    roleKey: "characters.roster.king.role",
    screen: "home",
    artwork: { src: "/characters/king.png", altKey: "characters.roster.king.alt" },
    accent: "var(--primary)",
    dialogueKeys: {
      default: "characters.dialogue.king.default",
      newPlayer: "characters.dialogue.king.new",
      levelUp: "characters.dialogue.king.levelUp",
      streak: "characters.dialogue.king.streak",
      progress: "characters.dialogue.king.progress",
    },
  },
  adventurer: {
    id: "adventurer",
    nameKey: "characters.roster.adventurer.name",
    roleKey: "characters.roster.adventurer.role",
    screen: "quests",
    artwork: { src: "/characters/adventurer.png", altKey: "characters.roster.adventurer.alt" },
    accent: "var(--stat-strength)",
    dialogueKeys: {
      default: "characters.dialogue.adventurer.default",
      newPlayer: "characters.dialogue.adventurer.new",
      levelUp: "characters.dialogue.adventurer.levelUp",
      streak: "characters.dialogue.adventurer.streak",
      progress: "characters.dialogue.adventurer.progress",
    },
  },
  scholar: {
    id: "scholar",
    nameKey: "characters.roster.scholar.name",
    roleKey: "characters.roster.scholar.role",
    screen: "trials",
    artwork: { src: "/characters/scientist.png", altKey: "characters.roster.scholar.alt" },
    accent: "var(--stat-endurance)",
    dialogueKeys: {
      default: "characters.dialogue.scholar.default",
      newPlayer: "characters.dialogue.scholar.new",
      levelUp: "characters.dialogue.scholar.levelUp",
      streak: "characters.dialogue.scholar.streak",
      progress: "characters.dialogue.scholar.progress",
    },
  },
  sage: {
    id: "sage",
    nameKey: "characters.roster.sage.name",
    roleKey: "characters.roster.sage.role",
    screen: "guide",
    artwork: { src: "/characters/wizard.png", altKey: "characters.roster.sage.alt" },
    accent: "var(--accent)",
    dialogueKeys: {
      default: "characters.dialogue.sage.default",
      newPlayer: "characters.dialogue.sage.new",
      levelUp: "characters.dialogue.sage.levelUp",
      streak: "characters.dialogue.sage.streak",
      progress: "characters.dialogue.sage.progress",
    },
  },
  hero: {
    id: "hero",
    nameKey: "characters.roster.hero.name",
    roleKey: "characters.roster.hero.role",
    screen: "character",
    artwork: { src: "/characters/sacred.png", altKey: "characters.roster.hero.alt" },
    accent: "var(--primary)",
    dialogueKeys: {
      default: "characters.dialogue.hero.default",
      newPlayer: "characters.dialogue.hero.new",
      levelUp: "characters.dialogue.hero.levelUp",
      streak: "characters.dialogue.hero.streak",
      progress: "characters.dialogue.hero.progress",
    },
  },
  hakari: {
    id: "hakari",
    nameKey: "characters.roster.hakari.name",
    roleKey: "characters.roster.hakari.role",
    screen: "legend",
    artwork: { src: "/characters/hakari.png", altKey: "characters.roster.hakari.alt" },
    accent: "var(--stat-vitality)",
    dialogueKeys: {
      default: "characters.dialogue.hakari.default",
      newPlayer: "characters.dialogue.hakari.new",
      levelUp: "characters.dialogue.hakari.levelUp",
      streak: "characters.dialogue.hakari.streak",
      progress: "characters.dialogue.hakari.progress",
    },
  },
  miri: {
    id: "miri",
    nameKey: "characters.roster.miri.name",
    roleKey: "characters.roster.miri.role",
    screen: "legend",
    artwork: { src: "/characters/sprite.png", altKey: "characters.roster.miri.alt" },
    accent: "var(--accent)",
    dialogueKeys: {
      default: "characters.dialogue.miri.default",
      newPlayer: "characters.dialogue.miri.new",
      levelUp: "characters.dialogue.miri.levelUp",
      streak: "characters.dialogue.miri.streak",
      progress: "characters.dialogue.miri.progress",
    },
  },
};

export function characterDialogue(id: CharacterId, game: GameState, t: TFunction): string {
  const character = CHARACTERS[id];
  const level = levelFromXp(game.xp);
  const key =
    game.xp === 0
      ? character.dialogueKeys.newPlayer
      : game.streak >= 7
        ? character.dialogueKeys.streak
        : level >= 5 || game.totalQuests + game.totalTrials > 0
          ? character.dialogueKeys.progress
          : character.dialogueKeys.default;
  return t(key);
}

export const legacyCharacterAliases = {
  scientist: "scholar",
  wizard: "sage",
  sprite: "miri",
} as const;
export type LegacyCharacterId = keyof typeof legacyCharacterAliases;
export function resolveCharacterId(id: CharacterId | LegacyCharacterId): CharacterId {
  return id in legacyCharacterAliases
    ? legacyCharacterAliases[id as LegacyCharacterId]
    : (id as CharacterId);
}
