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

// Synthesized sounds — no audio files needed.
let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

function tone(
  freq: number,
  start: number,
  duration: number,
  ctx: AudioContext,
  gainNode: GainNode,
  type: OscillatorType = "sine",
) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  env.gain.setValueAtTime(0, ctx.currentTime + start);
  env.gain.linearRampToValueAtTime(0.5, ctx.currentTime + start + 0.02);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.connect(env);
  env.connect(gainNode);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration);
}

export type SoundKey = "questComplete" | "levelUp";

export function playSound(key: SoundKey) {
  if (state.muted) return;
  const ctx = getCtx();
  const master = ctx.createGain();
  master.gain.value = state.volume;
  master.connect(ctx.destination);

  if (key === "questComplete") {
    // Gentle bright chime: C5 -> E5 -> G5
    tone(523.25, 0, 0.5, ctx, master);
    tone(659.25, 0.08, 0.5, ctx, master);
    tone(783.99, 0.16, 0.6, ctx, master);
  } else if (key === "levelUp") {
    // Ascending angelic fanfare
    tone(523.25, 0, 0.35, ctx, master);
    tone(659.25, 0.15, 0.35, ctx, master);
    tone(783.99, 0.3, 0.35, ctx, master);
    tone(1046.5, 0.45, 0.9, ctx, master, "triangle");
  }
}

// Background music (real audio file, respects mute/volume state)
let musicEl: HTMLAudioElement | null = null;

function applyMusicState() {
  if (!musicEl) return;
  musicEl.muted = state.muted;
  musicEl.volume = state.volume * 0.5; // موسيقى الخلفية أهدأ من المؤثرات
}

export function initBackgroundMusic() {
  if (musicEl) return; // already initialized

  // The audio asset is optional in previews. Check that it is actually served
  // before creating an HTMLAudioElement, which avoids unsupported-source errors.
  fetch("/audio/fantasy-theme.mp3", { method: "HEAD" })
    .then((response) => {
      if (!response.ok || !response.headers.get("content-type")?.startsWith("audio/")) return;
      musicEl = new Audio("/audio/fantasy-theme.mp3");
      musicEl.loop = true;
      applyMusicState();
      musicEl.play().catch(() => undefined);
      listeners.add(applyMusicState);
    })
    .catch(() => undefined);
}

// ── Character "talk" blips (بدل الكلام الحقيقي) ─────────────────────
interface BlipProfile {
  baseFreq: number; // النغمة الأساسية
  variance: number; // مقدار التذبذب العشوائي (يعطي إحساس حيوية)
  type: OscillatorType; // طابع الصوت
  blipDuration: number; // مدة كل "بلب"
  gap: number; // فاصل بين البلبات
}

const BLIP_PROFILES: Record<string, BlipProfile> = {
  king: { baseFreq: 180, variance: 18, type: "sawtooth", blipDuration: 0.055, gap: 0.05 },
  adventurer: { baseFreq: 260, variance: 35, type: "square", blipDuration: 0.04, gap: 0.035 },
  scientist: { baseFreq: 340, variance: 22, type: "sine", blipDuration: 0.045, gap: 0.04 },
  wizard: { baseFreq: 140, variance: 15, type: "triangle", blipDuration: 0.075, gap: 0.065 },
  sacred: { baseFreq: 400, variance: 18, type: "sine", blipDuration: 0.05, gap: 0.045 },
  maid: { baseFreq: 440, variance: 40, type: "square", blipDuration: 0.035, gap: 0.03 },
};

function playCharacterBlips(characterId: string, text: string) {
  const ctx = getCtx();
  const master = ctx.createGain();
  master.gain.value = state.volume * 0.35; // البلبات أهدأ من المؤثرات العادية
  master.connect(ctx.destination);

  const profile = BLIP_PROFILES[characterId] ?? BLIP_PROFILES.adventurer;
  const words = text.split(/\s+/).filter(Boolean);
  const step = profile.blipDuration + profile.gap;

  words.forEach((_, i) => {
    const jitter = (Math.random() - 0.5) * 2 * profile.variance;
    tone(
      profile.baseFreq + jitter,
      i * step,
      profile.blipDuration,
      ctx,
      master,
      profile.type,
    );
  });
}

// نفس اسم الدالة والتوقيع القديم، حتى FantasyCharacter.tsx ما يحتاج أي تعديل
export function speakCharacterLine(characterId: string, text: string, _langCode: string) {
  if (state.muted) return;
  if (typeof window === "undefined") return;
  playCharacterBlips(characterId, text);
}