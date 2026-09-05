import { useSyncExternalStore } from "react";

export interface BossState {
  hp: Record<string, number>;
  defeated: string[];
}

const DEFAULT_STATE: BossState = { hp: {}, defeated: [] };
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
      state = { hp: parsed.hp ?? {}, defeated: parsed.defeated ?? [] };
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
  });
  return defeatedNow;
}