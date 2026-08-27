// src/lib/sound-store.ts
// Matches the exact pattern of game-store.ts (useSyncExternalStore + localStorage,
// no external state library).

import { useSyncExternalStore } from "react";

export interface SoundState {
  muted: boolean;
  volume: number; // 0 to 1
}

const DEFAULT_SOUND_STATE: SoundState = {
  muted: false,
  volume: 0.7,
};

const STORAGE_KEY = "aethora-sound-v1";

let state: SoundState = DEFAULT_SOUND_STATE;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function commit(next: SoundState) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable — keep in-memory state
  }
  emit();
}

/** Load persisted sound settings from localStorage. Call once on the client after mount
 *  (same place/timing as hydrateGameStore() in game-store.ts). */
export function hydrateSoundStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SoundState>;
      state = { ...DEFAULT_SOUND_STATE, ...parsed };
      emit();
    }
  } catch {
    // corrupted save — start fresh
  }
}

export function getSoundState(): SoundState {
  return state;
}

export function toggleMuted() {
  commit({ ...state, muted: !state.muted });
}

export function setVolume(v: number) {
  commit({ ...state, volume: Math.min(1, Math.max(0, v)) });
}

export function useSound(): SoundState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => state,
    () => DEFAULT_SOUND_STATE,
  );
}
