import { useSyncExternalStore } from "react";

export interface BossState {
  hp: Record<string, number>;
  defeated: string[];
  /** Player HP per boss battle — bosses counter-attack and can fell the hero. */
  playerHp: Record<string, number>;
}

/** Player HP at the start of every boss battle. */
export const PLAYER_MAX_HP = 100;

const DEFAULT_STATE: BossState = { hp: {}, defeated: [], playerHp: {} };
const STORAGE_KEY = "aethora-bosses-v1";

let state: BossState = DEFAULT_STATE;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function commit(next: BossState) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable
  }
  emit();
}

export function hydrateBossStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BossState>;
      state = {
        hp: parsed.hp ?? {},
        defeated: parsed.defeated ?? [],
        playerHp: parsed.playerHp ?? {},
      };
      emit();
    }
  } catch {
    // corrupted save
  }
}

export function useBossStore(): BossState {
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

export function remainingHp(bossId: string, maxHp: number): number {
  return state.hp[bossId] ?? maxHp;
}

export function isBossDefeated(bossId: string): boolean {
  return state.defeated.includes(bossId);
}

/** Deal damage to a boss. Returns true if this hit defeats it. */
export function damageBoss(bossId: string, maxHp: number, amount: number): boolean {
  if (state.defeated.includes(bossId)) return false;
  const current = state.hp[bossId] ?? maxHp;
  const next = Math.max(0, current - amount);
  const defeatedNow = next <= 0;
  commit({
    hp: { ...state.hp, [bossId]: next },
    defeated: defeatedNow ? [...state.defeated, bossId] : state.defeated,
    playerHp: state.playerHp,
  });
  return defeatedNow;
}

/* ---------------- Player HP (boss counter-attacks) ---------------- */

export function playerHpRemaining(bossId: string): number {
  return state.playerHp[bossId] ?? PLAYER_MAX_HP;
}

/** True when the hero has been felled in this boss battle. */
export function isPlayerFallen(bossId: string): boolean {
  return playerHpRemaining(bossId) <= 0;
}

/**
 * Boss counter-attack: reduce the hero's HP (already mitigated by armor in
 * the caller). Returns true when this blow fells the hero.
 */
export function damagePlayer(bossId: string, amount: number): boolean {
  const current = playerHpRemaining(bossId);
  const next = Math.max(0, current - amount);
  commit({
    hp: state.hp,
    defeated: state.defeated,
    playerHp: { ...state.playerHp, [bossId]: next },
  });
  return next <= 0;
}

/** Retry after being felled: the hero rises with full HP; the boss keeps its wounds. */
export function healPlayer(bossId: string): void {
  commit({
    hp: state.hp,
    defeated: state.defeated,
    playerHp: { ...state.playerHp, [bossId]: PLAYER_MAX_HP },
  });
}
