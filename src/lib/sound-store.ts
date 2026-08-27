// src/lib/sound-store.ts

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
    // storage unavailable
  }
  emit();
}

export function hydrateSoundStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SoundState>;
      state = { ...DEFAULT_SOUND_STATE, ...parsed };
      emit();
    }
  } catch {
    // corrupted save
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

// Sound files must be placed in /public/sounds/ with these exact names:
export const SOUND_FILES = {
  questComplete: "/sounds/quest-complete.mp3",
  levelUp: "/sounds/level-up.mp3",
} as const;

export type SoundKey = keyof typeof SOUND_FILES;

export function playSound(key: SoundKey) {
  if (state.muted) return;
  const audio = new Audio(SOUND_FILES[key]);
  audio.volume = state.volume;
  audio.play().catch(() => {
    // playback blocked (e.g. autoplay policy) — ignore silently
  });
}
