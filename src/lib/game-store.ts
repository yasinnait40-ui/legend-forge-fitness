import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notifyStatsChanged, queueActivity } from "./cloud-sync";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_REWARDS,
  itemById,
  levelFromXp,
  STAT_CAP,
  type AchievementContext,
  type StatKey,
} from "./game-data";

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
  inventory: string[];
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
  inventory: ["worn-iron-blade", "travelers-garb", "cracked-mana-stone"],
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

/** Clear cached state when auth ownership changes or the user signs out. */
export function resetGameStore() {
  replaceGameState({
    ...DEFAULT_STATE,
    stats: { ...DEFAULT_STATE.stats },
    equipment: { ...DEFAULT_STATE.equipment },
  });
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
      if (
        state.lastActiveDate &&
        state.lastActiveDate !== todayKey() &&
        state.lastActiveDate !== yesterday
      ) {
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

/* -------------------------------------------------------------------------- */
/* P0.2: midnight rollover synchronization                                     */
/*                                                                            */
/* Quest/trial seals are date-scoped. Reading via questsDoneToday() already   */
/* resets them lazily, but a long-lived tab would keep displaying "Sealed"    */
/* past midnight until a re-render with a new day. This rolls the local state */
/* over exactly once per local day, across timers, tab focus, and visibility. */
/* -------------------------------------------------------------------------- */

let rolloverTimer: ReturnType<typeof setInterval> | null = null;

function rollOverDailySeals(s: GameState): GameState {
  const t = todayKey();
  const needsQuestRoll = s.questsToday.date !== "" && s.questsToday.date !== t;
  const needsTrialRoll = s.trialsToday.date !== "" && s.trialsToday.date !== t;
  if (!needsQuestRoll && !needsTrialRoll) return s;

  return {
    ...s,
    questsToday: needsQuestRoll ? { date: t, ids: [] } : s.questsToday,
    trialsToday: needsTrialRoll ? { date: t, ids: [] } : s.trialsToday,
  };
}

/**
 * Keep daily seals aligned with the local calendar. Call once on boot; it
 * installs listeners for midnight ticks, tab focus, and visibility changes.
 */
export function ensureDailyRollover() {
  if (typeof window === "undefined" || rolloverTimer) return;

  const tick = () => {
    const rolled = rollOverDailySeals(state);
    if (rolled !== state) {
      commit(rolled);
    }
  };

  tick();
  // Poll cheaply at the top of each minute; commit() only fires when the day
  // key actually changes, so this is effectively a no-op 1439 times a day.
  rolloverTimer = setInterval(tick, 60_000);
  window.addEventListener("focus", tick);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tick();
  });
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
  /** True when saved locally during offline mode and queued for cloud replay. */
  optimistic?: boolean;
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

  // Grant achievement rewards
  for (const achId of unlocked) {
    const rewardItemId = ACHIEVEMENT_REWARDS[achId];
    if (rewardItemId && !next.inventory.includes(rewardItemId)) {
      next.inventory = [...next.inventory, rewardItemId];
    }
  }

  const newLevel = levelFromXp(next.xp);
  return { next, unlocked, leveledUp: newLevel > prevLevel, newLevel };
}

/** Complete through the transaction-safe Supabase RPC. Falls back to an optimistic local save that replays when connectivity returns. */
export async function completeQuest(
  questId: string,
  xp: number,
  stats: Partial<Record<StatKey, number>>,
): Promise<AwardResult | null> {
  return completeActivity("quest", questId, xp, stats);
}

async function completeActivity(
  kind: "quest" | "trial",
  activityId: string,
  fallbackXp = 0,
  fallbackStats: Partial<Record<StatKey, number>> = {},
  fallbackName?: string,
): Promise<AwardResult | null> {
  let data: unknown = null;
  let rpcError: { message: string } | null = null;
  try {
    const result = await supabase.rpc(
      "complete_activity" as never,
      {
        p_kind: kind,
        p_activity_id: activityId,
      } as never,
    );
    data = result.data;
    rpcError = result.error ? { message: result.error.message } : null;
  } catch (e) {
    // Network-level failure (offline, fetch rejected).
    rpcError = { message: e instanceof Error ? e.message : "network unavailable" };
  }

  if (rpcError || !data) {
    // Offline (or RPC unavailable): keep the hero moving. Save optimistically,
    // queue the activity, and let cloud-sync replay it when back online.
    console.warn("[v0] activity saved offline, queued for sync:", rpcError?.message);
    queueActivity(kind, activityId);
    return optimisticComplete(kind, activityId, fallbackXp, fallbackStats, fallbackName);
  }
  const result = data as {
    duplicate?: boolean;
    xpGained?: number;
    xp?: number;
    level?: number;
    rewardItem?: string | null;
    streak?: number;
    bestStreak?: number;
  };
  if (result.duplicate) return null;
  const xp = result.xp ?? state.xp;
  const next: GameState = {
    ...state,
    xp,
    totalQuests: kind === "quest" ? state.totalQuests + 1 : state.totalQuests,
    totalTrials: kind === "trial" ? state.totalTrials + 1 : state.totalTrials,
    lastActiveDate: todayKey(),
    streak: result.streak ?? state.streak,
    bestStreak: result.bestStreak ?? state.bestStreak,
  };
  if (kind === "quest")
    next.questsToday = { date: todayKey(), ids: [...questsDoneToday(state), activityId] };
  if (kind === "trial")
    next.trialsToday = { date: todayKey(), ids: [...trialsDoneToday(state), activityId] };
  if (kind === "trial")
    next.trialsEver = state.trialsEver.includes(activityId)
      ? state.trialsEver
      : [...state.trialsEver, activityId];
  if (result.rewardItem) next.equipment = { ...next.equipment, weapon: result.rewardItem };

  /*
   * P0.2: keep local stat/achievement progress alive on the authoritative
   * path. The server owns XP/level/streak, but stats gains and local
   * achievement badges were previously only applied on the offline path —
   * meaning signed-in players watched their bars freeze.
   */
  for (const k of Object.keys(fallbackStats) as StatKey[]) {
    const gain = fallbackStats[k] ?? 0;
    next.stats[k] = Math.min(STAT_CAP, (next.stats[k] ?? 0) + gain);
  }
  const t2 = todayKey();
  const existingActivity = next.activityLog.find((e) => e.date === t2);
  next.activityLog = existingActivity
    ? next.activityLog.map((e) => (e.date === t2 ? { ...e, xp: e.xp + (result.xpGained ?? 0) } : e))
    : [...next.activityLog, { date: t2, xp: result.xpGained ?? 0 }];
  const newlyUnlocked = ACHIEVEMENTS.filter(
    (a) => !next.achievements.includes(a.id) && a.test(next as AchievementContext),
  ).map((a) => a.id);
  next.achievements = [...next.achievements, ...newlyUnlocked];

  commit(next);
  // Reliably persist stat columns (used by the progress charts) after each
  // authoritative completion.
  notifyStatsChanged();
  return {
    xpGained: result.xpGained ?? 0,
    treasure: result.rewardItem ? { type: "cosmetic", itemId: result.rewardItem } : null,
    leveledUp: (result.level ?? 1) > levelFromXp(state.xp),
    newLevel: result.level ?? levelFromXp(xp),
    unlocked: newlyUnlocked,
    autoCompletedQuest: null,
  };
}

/**
 * Optimistic offline completion: grants estimated XP/stats immediately, queues
 * the activity for authoritative replay, and keeps achievements/streak logic.
 * The server-side UNIQUE constraints make replay idempotent.
 */
function optimisticComplete(
  kind: "quest" | "trial",
  activityId: string,
  xp: number,
  stats: Partial<Record<StatKey, number>>,
  name?: string,
): AwardResult | null {
  if (kind === "quest") {
    if (questsDoneToday(state).includes(activityId)) return null;
  } else if (trialsDoneToday(state).includes(activityId)) {
    return null;
  }

  const working: GameState = {
    ...state,
    questsToday:
      kind === "quest"
        ? { date: todayKey(), ids: [...questsDoneToday(state), activityId] }
        : state.questsToday,
    trialsToday:
      kind === "trial"
        ? { date: todayKey(), ids: [...trialsDoneToday(state), activityId] }
        : state.trialsToday,
    trialsEver:
      kind === "trial" && !state.trialsEver.includes(activityId)
        ? [...state.trialsEver, activityId]
        : state.trialsEver,
    totalQuests: state.totalQuests + (kind === "quest" ? 1 : 0),
    totalTrials: state.totalTrials + (kind === "trial" ? 1 : 0),
    workoutLog:
      kind === "trial"
        ? [...state.workoutLog, { date: todayKey(), name: name ?? activityId, xp }].slice(-30)
        : state.workoutLog,
  };
  const { next, unlocked, leveledUp, newLevel } = applyAward(working, xp, stats);
  commit(next);
  // Persist stat columns when signed in (no-op offline); the activity itself
  // is replayed authoritatively from the queue.
  notifyStatsChanged();
  return {
    xpGained: xp,
    treasure: null,
    optimistic: true,
    leveledUp,
    newLevel,
    unlocked,
    autoCompletedQuest: null,
  };
}

/** @deprecated use completeQuest; retained for existing callers. */
function legacyCompleteQuest(
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
  const chestXp = treasure?.type === "xp" ? (treasure.amount ?? 0) : 0;
  const rewarded = { ...next, xp: next.xp + streakBonus + chestXp };
  if (treasure?.type === "cosmetic")
    rewarded.equipment = {
      ...rewarded.equipment,
      weapon: treasure.itemId ?? rewarded.equipment.weapon,
    };
  commit(rewarded);
  return {
    xpGained: xp + streakBonus + chestXp,
    treasure,
    leveledUp,
    newLevel: levelFromXp(rewarded.xp),
    unlocked,
    autoCompletedQuest: null,
  };
}

/** Mark a training trial complete. Also seals Guardian's Discipline if open. */
export async function completeTrial(
  trialId: string,
  name: string,
  xp: number,
  stats: Partial<Record<StatKey, number>>,
): Promise<AwardResult | null> {
  return completeActivity("trial", trialId, xp, stats, name);
}

function legacyCompleteTrial(
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
  const chestXp = treasure?.type === "xp" ? (treasure.amount ?? 0) : 0;
  const rewarded = { ...next, xp: next.xp + streakBonus + chestXp };
  if (treasure?.type === "cosmetic")
    rewarded.equipment = {
      ...rewarded.equipment,
      weapon: treasure.itemId ?? rewarded.equipment.weapon,
    };
  commit(rewarded);
  return {
    xpGained: xp + streakBonus + chestXp,
    treasure,
    leveledUp,
    newLevel: levelFromXp(rewarded.xp),
    unlocked,
    autoCompletedQuest,
  };
}

export function equipItem(slot: "weapon" | "armor" | "relic", itemId: string): boolean {
  // Validate ownership
  if (!hasItem(itemId)) {
    console.warn("[game-store] Cannot equip item not in inventory:", itemId);
    return false;
  }
  const item = itemById(itemId);
  if (!item || item.slot !== slot) {
    console.warn("[game-store] Item does not belong to slot:", itemId, slot);
    return false;
  }
  const itemLevel = levelFromXp(state.xp);
  if (itemLevel < item.levelReq) {
    console.warn("[game-store] Item level requirement not met:", itemId, item.levelReq, itemLevel);
    return false;
  }
  commit({ ...state, equipment: { ...state.equipment, [slot]: itemId } });
  return true;
}

export function resetLegend() {
  commit({
    ...DEFAULT_STATE,
    stats: { ...DEFAULT_STATE.stats },
    equipment: { ...DEFAULT_STATE.equipment },
    inventory: [...DEFAULT_STATE.inventory],
  });
}

/** Add an item to inventory if not already owned. Does not grant by default - used for reward distribution. */
export function addToInventory(itemId: string): boolean {
  if (state.inventory.includes(itemId)) return false;
  const next: GameState = { ...state, inventory: [...state.inventory, itemId] };
  // Auto-equip if this is a weapon/armor/relic and slot is empty or same as current
  const item = itemById(itemId);
  if (item) {
    next.equipment = { ...next.equipment, [item.slot]: itemId };
  }
  commit(next);
  return true;
}

/** Check if player owns an item */
export function hasItem(itemId: string): boolean {
  return state.inventory.includes(itemId);
}
