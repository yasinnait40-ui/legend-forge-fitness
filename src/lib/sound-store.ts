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

// ── Character voices ────────────────────────────────────────────────
export interface VoiceProfile {
  pitch: number;
  rate: number;
  gender: "male" | "female";
}

const VOICE_PROFILES: Record<string, VoiceProfile> = {
  king: { pitch: 0.75, rate: 0.92, gender: "male" },
  adventurer: { pitch: 0.95, rate: 1.08, gender: "male" },
  scientist: { pitch: 1.0, rate: 1.0, gender: "female" },
  wizard: { pitch: 0.6, rate: 0.82, gender: "male" },
  sacred: { pitch: 1.0, rate: 0.95, gender: "female" },
  maid: { pitch: 1.25, rate: 1.05, gender: "female" },
};

const LANG_VOICE_CODES: Record<string, string> = {
  en: "en-US",
  ar: "ar-SA",
  ja: "ja-JP",
  es: "es-ES",
  fr: "fr-FR",
};

// كاش لأصوات المتصفح
let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  cachedVoices = window.speechSynthesis.getVoices();
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

const MALE_HINTS = ["male", "david", "mark", "daniel", "fred", "george", "guy", "alex"];
const FEMALE_HINTS = [
  "female",
  "zira",
  "samantha",
  "susan",
  "victoria",
  "karen",
  "moira",
  "tessa",
  "salma",
];

function pickVoice(langCode: string, gender: "male" | "female"): SpeechSynthesisVoice | undefined {
  if (!cachedVoices.length) loadVoices();
  const langPrefix = (LANG_VOICE_CODES[langCode] ?? "en-US").split("-")[0];
  const sameLang = cachedVoices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  const hints = gender === "male" ? MALE_HINTS : FEMALE_HINTS;

  const matched = sameLang.find((v) => hints.some((h) => v.name.toLowerCase().includes(h)));
  if (matched) return matched;

  if (sameLang.length) return sameLang[0];

  return cachedVoices[0];
}

export function speakCharacterLine(characterId: string, text: string, langCode: string) {
  if (state.muted) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const profile = VOICE_PROFILES[characterId] ?? { pitch: 1, rate: 1, gender: "female" as const };

  const voice = pickVoice(langCode, profile.gender);
  if (voice) utterance.voice = voice;

  utterance.pitch = profile.pitch;
  utterance.rate = profile.rate;
  utterance.volume = state.volume;
  utterance.lang = LANG_VOICE_CODES[langCode] ?? "en-US";
  window.speechSynthesis.speak(utterance);
}