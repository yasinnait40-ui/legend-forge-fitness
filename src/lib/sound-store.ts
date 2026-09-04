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
    tone(523.25, 0, 0.5, ctx, master);
    tone(659.25, 0.08, 0.5, ctx, master);
    tone(783.99, 0.16, 0.6, ctx, master);
  } else if (key === "levelUp") {
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
  musicEl.volume = state.volume * 0.5;
}

export function initBackgroundMusic() {
  if (musicEl) return;

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

// ── Character talk sounds (بصمة صوتية مميزة لكل شخصية) ───────────────
function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

let noiseBuffer: AudioBuffer | null = null;
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    const length = ctx.sampleRate * 0.3;
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

// الملك: نفخة بوق ملكي (غليظة + هارمونيك)
function playKingWord(ctx: AudioContext, master: GainNode, start: number): number {
  const j = rand(-6, 6);
  tone(98 + j, start, 0.17, ctx, master, "sawtooth");
  tone(196 + j, start + 0.01, 0.13, ctx, master, "triangle");
  return 0.24;
}

// الخادمة: جرس ناعم محترم
function playMaidWord(ctx: AudioContext, master: GainNode, start: number): number {
  const j = rand(-10, 10);
  tone(520 + j, start, 0.08, ctx, master, "sine");
  return 0.1;
}

// العالمة: فقاعات معمل (pitch يقفز صعود-نزول)
function playScientistWord(ctx: AudioContext, master: GainNode, start: number): number {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "sine";
  const base = 300 + rand(-30, 30);
  const t0 = ctx.currentTime + start;
  osc.frequency.setValueAtTime(base * 0.6, t0);
  osc.frequency.exponentialRampToValueAtTime(base * 1.6, t0 + 0.05);
  osc.frequency.exponentialRampToValueAtTime(base * 0.9, t0 + 0.09);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(0.5, t0 + 0.015);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
  osc.connect(env);
  env.connect(master);
  osc.start(t0);
  osc.stop(t0 + 0.09);
  return 0.13;
}

// الساحر: شرارة سحرية (نغمة تصعد بلمعان)
function playWizardWord(ctx: AudioContext, master: GainNode, start: number): number {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "triangle";
  const base = 260 + rand(-15, 15);
  const t0 = ctx.currentTime + start;
  osc.frequency.setValueAtTime(base, t0);
  osc.frequency.exponentialRampToValueAtTime(base * 2.2, t0 + 0.12);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(0.4, t0 + 0.02);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
  osc.connect(env);
  env.connect(master);
  osc.start(t0);
  osc.stop(t0 + 0.16);
  tone(base * 3 + rand(-20, 20), start + 0.03, 0.05, ctx, master, "sine");
  return 0.2;
}

// المغامر: صدام سيوف معدني
function playAdventurerWord(ctx: AudioContext, master: GainNode, start: number): number {
  const buffer = getNoiseBuffer(ctx);
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 2200 + rand(-300, 300);
  bandpass.Q.value = 8;
  const env = ctx.createGain();
  const t0 = ctx.currentTime + start;
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(0.6, t0 + 0.005);
  env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
  noise.connect(bandpass);
  bandpass.connect(env);
  env.connect(master);
  noise.start(t0);
  noise.stop(t0 + 0.08);
  return 0.12;
}

// ميري / هاكاري / أي شخصية خفيفة لطيفة: جرس رقيق
function playLightWord(ctx: AudioContext, master: GainNode, start: number): number {
  const j = rand(-15, 15);
  tone(700 + j, start, 0.06, ctx, master, "sine");
  return 0.09;
}

type BlipFn = (ctx: AudioContext, master: GainNode, start: number) => number;

// ⚠️ إذا أسماء الشخصيات (IDs) بملف characters.ts مختلفة عن هاي، بس غيّر المفتاح هون
const CHARACTER_VOICES: Record<string, BlipFn> = {
  king: playKingWord,
  maid: playMaidWord,
  scientist: playScientistWord,
  wizard: playWizardWord,
  adventurer: playAdventurerWord,
  sacred: playLightWord,
  meri: playLightWord,
  hakari: playLightWord,
};

function playCharacterBlips(characterId: string, text: string) {
  const ctx = getCtx();
  const master = ctx.createGain();
  master.gain.value = state.volume * 0.4;
  master.connect(ctx.destination);

  const blipFn = CHARACTER_VOICES[characterId] ?? playMaidWord;
  const words = text.split(/\s+/).filter(Boolean);

  let cursor = 0;
  words.forEach(() => {
    cursor += blipFn(ctx, master, cursor);
  });
}

// نفس اسم الدالة والتوقيع القديم، ما تحتاج تعدل FantasyCharacter.tsx
export function speakCharacterLine(characterId: string, text: string, _langCode: string) {
  if (state.muted) return;
  if (typeof window === "undefined") return;
  playCharacterBlips(characterId, text);
}