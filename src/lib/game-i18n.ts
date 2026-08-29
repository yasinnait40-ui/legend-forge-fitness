// Translation helpers for world data (quests, trials, achievements, equipment).
import { useTranslation } from "react-i18next";
import {
  RARITY_LABELS,
  SLOT_LABELS,
  STAT_LABELS,
  titleForLevel,
  type Achievement,
  type EquipSlot,
  type EquipmentItem,
  type Quest,
  type Rarity,
  type StatKey,
  type Trial,
} from "./game-data";

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function useGameText() {
  const { t } = useTranslation();

  return {
    stat: (key: StatKey) => t(`game.stats.${key}`, STAT_LABELS[key]),
    rarity: (key: Rarity) => t(`game.rarity.${key}`, RARITY_LABELS[key]),
    slot: (key: EquipSlot) => t(`game.slots.${key}`, SLOT_LABELS[key]),
    title: (level: number) => {
      const base = titleForLevel(level);
      return t(`game.titles.${slug(base)}`, base);
    },
    quest: (q: Quest) => ({
      name: t(`game.quests.${q.id}.name`, q.name),
      description: t(`game.quests.${q.id}.description`, q.description),
      auto: q.auto ? t(`game.quests.${q.id}.auto`, q.auto) : undefined,
    }),
    trial: (tr: Trial) => ({
      name: t(`game.trials.${tr.id}.name`, tr.name),
      epithet: t(`game.trials.${tr.id}.epithet`, tr.epithet),
      exercises: tr.exercises.map((ex, i) => ({
        name: t(`game.trials.${tr.id}.exercises.${i}.name`, ex.name),
        sets: t(`game.trials.${tr.id}.exercises.${i}.sets`, ex.sets),
      })),
    }),
    achievement: (a: Achievement) => ({
      name: t(`game.achievements.${a.id}.name`, a.name),
      flavor: t(`game.achievements.${a.id}.flavor`, a.flavor),
    }),
    item: (i: EquipmentItem) => ({
      name: t(`game.equipment.${i.id}.name`, i.name),
      flavor: t(`game.equipment.${i.id}.flavor`, i.flavor),
    }),
  };
}
