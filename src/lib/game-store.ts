import { useSyncExternalStore } from "react";
import { ACHIEVEMENTS, levelFromXp, STAT_CAP, type StatKey } from "./game-data";

export interface WorkoutLogEntry {
  date: string;
  name: string;
  xp: number;
}

export interface ActivityEntry {
  date: string;
  xp: number;
}

export interface GameState {
  xp: number;
  stats: Record<StatKey, number>;
  streak: number;
  bestStreak: number;
  lastActiveDate: string | null;
  questsToday: { date: string; ids: string[] };
  trialsToday: { date: string; ids: string[] };
  trialsEver: string[];
  workoutLog: WorkoutLogEntry[];
  activityLog: ActivityEntry[];
  achievements: string[];
  equipment: Record<"weapon" | "armor" | "relic", string>;
  totalQuests: number;
  totalTrials: number;
}

const DEFAULT_STATE: GameState = {
  xp: 0,
  stats: { strength: 12, endurance: 10, agility: 11, vitality: 12, recovery: 10 },
  streak: 0,
  bestStreak: 0,
  lastActiveDate: null,
  questsToday: { date: "", ids: [] },
  trialsToday: { date: "", ids: [] },
  trialsEver: [],
  workoutLog: [],
  activityLog: [],
  achievements: [],
  equipment: { weapon: "worn-iron-blade", armor: "travelers-garb", relic: "cracked-mana-stone" },
  totalQuests: 0,
  totalTrials: 0,
};

const STORAGE_KEY = "aethora-legend-v1";

let state: GameState = DEFAULT_STATE;
const listeners = new Set<() => void>();

export type CommitObserver = (prev: GameState, next: GameState) => void;
const observers = new Set<CommitObserver>();

/** Observe every committed change (used by cloud sync). Returns an unsubscribe fn. */
export function observeCommits(fn: CommitObserver): () => void {
  observers.add(fn);
  return () => {
    observers.delete(fn);
  };
}

export function getGameState(): GameState {
  return state;
}

function emit() {
  listeners.forEach((l) => l());
}

function commit(next: GameState) {
  const prev = state;
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — keep in-memory state
  }
  emit();
  observers.forEach((o) => o(prev, next));
}

/** Replace local state wholesale (used when the cloud legend is ahead). */
export function replaceGameState(next: GameState, notifyObservers = false) {
  const prev = state;
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  emit();
  if (notifyObservers) observers.forEach((o) => o(prev, next));
}

/** Load persisted legend from localStorage. Call once on the client after mount. */
export function hydrateGameStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameState>;
      state = {
        ...DEFAULT_STATE,
        ...parsed,
        stats: { ...DEFAULT_STATE.stats, ...(parsed.stats ?? {}) },
        equipment: { ...DEFAULT_STATE.equipment, ...(parsed.equipment ?? {}) },
      };
      const yesterday = todayKey(new Date(Date.now() - 86400000));
      if (state.lastActiveDate && state.lastActiveDate !== todayKey() && state.lastActiveDate !== yesterday) {
        state = { ...state, streak: 0 };
      }
      emit();
    }
  } catch {
    // corrupted save — start a new legend
  }
}

export function useGame(): GameState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => state,
    () => DEFAULT_STATE,
  );
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function questsDoneToday(s: GameState): string[] {
  return s.questsToday.date === todayKey() ? s.questsToday.ids : [];
}

export function trialsDoneToday(s: GameState): string[] {
  return s.trialsToday.date === todayKey() ? s.trialsToday.ids : [];
}

export interface TreasureReward {
  type: "xp" | "cosmetic";
  amount?: number;
  itemId?: string;
}

export interface AwardResult {
  xpGained: number;
  treasure: TreasureReward | null;
  leveledUp: boolean;
  newLevel: number;
  unlocked: string[];
  autoCompletedQuest: string | null;
}

function applyAward(
  s: GameState,
  xp: number,
  statGain: Partial<Record<StatKey, number>>,
): { next: GameState; unlocked: string[]; leveledUp: boolean; newLevel: number } {
  const prevLevel = levelFromXp(s.xp);
  const next: GameState = { ...s, xp: s.xp + xp, stats: { ...s.stats } };
  for (const k of Object.keys(statGain) as StatKey[]) {
    next.stats[k] = Math.min(STAT_CAP, (next.stats[k] ?? 0) + (statGain[k] ?? 0));
  }

  // Streak: first award of a new day advances it.
  const t = todayKey();
  if (next.lastActiveDate !== t) {
    const yesterday = todayKey(new Date(Date.now() - 86400000));
    next.streak = next.lastActiveDate === yesterday ? next.streak + 1 : 1;
    next.lastActiveDate = t;
    next.bestStreak = Math.max(next.bestStreak, next.streak);
  }

  // Activity log (for the observatory charts).
  const t2 = todayKey();
  const existing = next.activityLog.find((e) => e.date === t2);
  next.activityLog = existing
    ? next.activityLog.map((e) => (e.date === t2 ? { ...e, xp: e.xp + xp } : e))
    : [...next.activityLog, { date: t2, xp }];
  next.activityLog = next.activityLog.slice(-60);

  // Achievements.
  const unlocked = ACHIEVEMENTS.filter(
    (a) => !next.achievements.includes(a.id) && a.test(next),
  ).map((a) => a.id);
  next.achievements = [...next.achievements, ...unlocked];

  const newLevel = levelFromXp(next.xp);
  return { next, unlocked, leveledUp: newLevel > prevLevel, newLevel };
}

/** Mark a daily quest complete. Returns null if it was already done today. */
export function completeQuest(
  questId: string,
  xp: number,
  stats: Partial<Record<StatKey, number>>,
): AwardResult | null {
  if (questsDoneToday(state).includes(questId)) return null;
  const working: GameState = {
    ...state,
    questsToday: { date: todayKey(), ids: [...questsDoneToday(state), questId] },
    totalQuests: state.totalQuests + 1,
  };
  const { next, unlocked, leveledUp, newLevel } = applyAward(working, xp, stats);
  const streakBonus = [3, 7, 14, 30].includes(next.streak) ? next.streak * 5 : 0;
  const chestRoll = Math.random() < 0.25;
  const treasure = chestRoll
    ? Math.random() < 0.7
      ? { type: "xp" as const, amount: 25 }
      : Math.random() < 0.83
        ? { type: "cosmetic" as const, itemId: "sun-forged-blade" }
        : { type: "xp" as const, amount: 100 }
    : null;
  const chestXp = treasure?.type === "xp" ? treasure.amount ?? 0 : 0;
  const rewarded = { ...next, xp: next.xp + streakBonus + chestXp };
  if (treasure?.type === "cosmetic") rewarded.equipment = { ...rewarded.equipment, weapon: treasure.itemId ?? rewarded.equipment.weapon };
  commit(rewarded);
  return { xpGained: xp + streakBonus + chestXp, treasure, leveledUp, newLevel: levelFromXp(rewarded.xp), unlocked, autoCompletedQuest: null };
}

/** Mark a training trial complete. Also seals Guardian's Discipline if open. */
export function completeTrial(
  trialId: string,
  name: string,
  xp: number,
  stats: Partial<Record<StatKey, number>>,
): AwardResult | null {
  if (trialsDoneToday(state).includes(trialId)) return null;
  const working: GameState = {
    ...state,
    trialsToday: { date: todayKey(), ids: [...trialsDoneToday(state), trialId] },
    trialsEver: state.trialsEver.includes(trialId)
      ? state.trialsEver
      : [...state.trialsEver, trialId],
    totalTrials: state.totalTrials + 1,
    workoutLog: [...state.workoutLog, { date: todayKey(), name, xp }].slice(-30),
  };
  let { next, unlocked, leveledUp, newLevel } = applyAward(working, xp, stats);
  let autoCompletedQuest: string | null = null;

  // Guardian's Discipline auto-seals on any conquered trial.
  if (!questsDoneToday(next).includes("guardians-discipline")) {
    const withQuest: GameState = {
      ...next,
      questsToday: { date: todayKey(), ids: [...questsDoneToday(next), "guardians-discipline"] },
      totalQuests: next.totalQuests + 1,
    };
    const second = applyAward(withQuest, 100, { vitality: 4 });
    next = second.next;
    unlocked = [...new Set([...unlocked, ...second.unlocked])];
    leveledUp = leveledUp || second.leveledUp;
    newLevel = second.newLevel;
    autoCompletedQuest = "guardians-discipline";
  }

  const streakBonus = [3, 7, 14, 30].includes(next.streak) ? next.streak * 5 : 0;
  const chestRoll = Math.random() < 0.25;
  const treasure = chestRoll
    ? Math.random() < 0.7
      ? { type: "xp" as const, amount: 25 }
      : Math.random() < 0.83
        ? { type: "cosmetic" as const, itemId: "sun-forged-blade" }
        : { type: "xp" as const, amount: 100 }
    : null;
  const chestXp = treasure?.type === "xp" ? treasure.amount ?? 0 : 0;
  const rewarded = { ...next, xp: next.xp + streakBonus + chestXp };
  if (treasure?.type === "cosmetic") rewarded.equipment = { ...rewarded.equipment, weapon: treasure.itemId ?? rewarded.equipment.weapon };
  commit(rewarded);
  return { xpGained: xp + streakBonus + chestXp, treasure, leveledUp, newLevel: levelFromXp(rewarded.xp), unlocked, autoCompletedQuest };
}

export function equipItem(slot: "weapon" | "armor" | "relic", itemId: string) {
  commit({ ...state, equipment: { ...state.equipment, [slot]: itemId } });
}

export function resetLegend() {
  commit({
    ...DEFAULT_STATE,
    stats: { ...DEFAULT_STATE.stats },
    equipment: { ...DEFAULT_STATE.equipment },
  });
}
