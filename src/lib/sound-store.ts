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

/**
 * P0.1 hardening: every volume that enters the store (from a saved payload or
 * from UI input) passes through here. Non-finite values (NaN/Infinity from a
 * corrupted save or a bad input event) fall back to the default instead of
 * poisoning AudioContext gains or HTMLMediaElement.volume, which throws on
 * non-finite floats.
 */
function clampVolume(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    return DEFAULT_SOUND_STATE.volume;
  }

  return Math.min(1, Math.max(0, v));
}

let state: SoundState = DEFAULT_SOUND_STATE;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function commit(next: SoundState) {
  state = next;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable.
  }

  emit();
}

export function hydrateSoundStore() {
  if (typeof window === "undefined") return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SoundState>;

      state = {
        ...DEFAULT_SOUND_STATE,
        ...parsed,
        volume: clampVolume(parsed.volume),
        muted: typeof parsed.muted === "boolean" ? parsed.muted : DEFAULT_SOUND_STATE.muted,
      };

      emit();
    }
  } catch {
    // Ignore corrupted saved sound settings.
  }
}

export function getSoundState(): SoundState {
  return state;
}

export function toggleMuted() {
  commit({
    ...state,
    muted: !state.muted,
  });

  applyMusicState();
}

export function setVolume(v: number) {
  commit({
    ...state,
    volume: clampVolume(v),
  });

  applyMusicState();
}

export function useSound(): SoundState {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);

      return () => {
        listeners.delete(callback);
      };
    },
    () => state,
    () => DEFAULT_SOUND_STATE,
  );
}

/* -------------------------------------------------------------------------- */
/* Web Audio                                                                    */
/* -------------------------------------------------------------------------- */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;

  // A closed context can never be resumed again (e.g. after a page-level
  // teardown). Recover by lazily creating a fresh one on the next sound.
  if (audioCtx) {
    try {
      if (audioCtx.state === "closed") audioCtx = null;
    } catch {
      audioCtx = null;
    }
  }

  if (!audioCtx) {
    const AudioContextCtor =
      window.AudioContext ??
      (window as unknown as {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;

    if (!AudioContextCtor) return null;

    // P0.1 hardening: constructing an AudioContext can throw on some
    // browsers/embedded webviews (hardware budget, privacy settings).
    // Sound must never crash the caller.
    try {
      audioCtx = new AudioContextCtor();
    } catch {
      return null;
    }
  }

  return audioCtx;
}

async function resumeAudioContext(ctx: AudioContext): Promise<boolean> {
  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    return ctx.state === "running";
  } catch {
    return false;
  }
}

function createMaster(ctx: AudioContext, multiplier = 1): GainNode {
  const master = ctx.createGain();

  master.gain.value = clampVolume(state.volume * multiplier);
  master.connect(ctx.destination);

  return master;
}

function tone(
  freq: number,
  start: number,
  duration: number,
  ctx: AudioContext,
  gainNode: GainNode,
  type: OscillatorType = "sine",
  peakGain = 0.5,
) {
  const osc = ctx.createOscillator();
  const envelope = ctx.createGain();

  const startTime = ctx.currentTime + start;
  const endTime = startTime + duration;

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  envelope.gain.setValueAtTime(0.0001, startTime);
  envelope.gain.linearRampToValueAtTime(
    peakGain,
    startTime + Math.min(0.02, duration * 0.2),
  );
  envelope.gain.exponentialRampToValueAtTime(0.001, endTime);

  osc.connect(envelope);
  envelope.connect(gainNode);

  osc.start(startTime);
  osc.stop(endTime);
}

/* -------------------------------------------------------------------------- */
/* General game sounds                                                         */
/* -------------------------------------------------------------------------- */

export type SoundKey = "questComplete" | "levelUp";

export function playSound(key: SoundKey) {
  if (state.muted) return;
  if (typeof window === "undefined") return;

  const ctx = getCtx();
  if (!ctx) return;

  void resumeAudioContext(ctx).then((ready) => {
    if (!ready || state.muted) return;

    // P0.1 hardening: graph construction/scheduling can still throw in edge
    // cases (closed context races, OS-level audio failures). Keep it silent.
    try {
      const master = createMaster(ctx);

      if (key === "questComplete") {
        tone(523.25, 0, 0.5, ctx, master, "sine", 0.45);
        tone(659.25, 0.08, 0.5, ctx, master, "sine", 0.45);
        tone(783.99, 0.16, 0.6, ctx, master, "triangle", 0.4);
      }

      if (key === "levelUp") {
        tone(523.25, 0, 0.35, ctx, master, "sine", 0.4);
        tone(659.25, 0.15, 0.35, ctx, master, "sine", 0.4);
        tone(783.99, 0.3, 0.35, ctx, master, "triangle", 0.4);
        tone(1046.5, 0.45, 0.9, ctx, master, "triangle", 0.45);
      }
    } catch {
      // Never let a sound effect propagate an exception to the caller.
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Background music                                                            */
/* -------------------------------------------------------------------------- */

let musicEl: HTMLAudioElement | null = null;
let musicLoadFailed = false;
let musicRetryBound = false;

const MUSIC_RETRY_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;

function tryStartMusic(): void {
  const el = musicEl;

  if (!el || state.muted || musicLoadFailed || !el.paused) return;

  void el
    .play()
    .then(() => {
      // Autoplay unlocked — stop listening for further retry triggers.
      removeMusicRetryListeners();
    })
    .catch(() => {
      // Still blocked (or the media failed). The next interaction retries.
    });
}

function onMusicRetryEvent(): void {
  tryStartMusic();
}

function addMusicRetryListeners(): void {
  if (typeof window === "undefined" || musicRetryBound) return;

  musicRetryBound = true;

  for (const eventName of MUSIC_RETRY_EVENTS) {
    window.addEventListener(eventName, onMusicRetryEvent, {
      passive: eventName !== "keydown",
    });
  }
}

function removeMusicRetryListeners(): void {
  if (typeof window === "undefined" || !musicRetryBound) return;

  musicRetryBound = false;

  for (const eventName of MUSIC_RETRY_EVENTS) {
    window.removeEventListener(eventName, onMusicRetryEvent);
  }
}

function applyMusicState() {
  if (!musicEl) return;

  musicEl.muted = state.muted;
  musicEl.volume = clampVolume(state.volume * 0.5);

  // P0.1 fix: previously, if the browser blocked the very first autoplay
  // attempt while muted (or the first interaction was consumed while muted),
  // unmuting would never start the music until a full page reload. Now any
  // unmute/volume change re-attempts playback, which is itself a user gesture.
  if (!state.muted && !musicLoadFailed && musicEl.paused) {
    tryStartMusic();
  }
}

export function initBackgroundMusic() {
  if (typeof window === "undefined") return;
  if (musicEl) {
    applyMusicState();
    return;
  }

  const musicPath = "/audio/fantasy-theme.mp3";

  // P0.1 hardening: new Audio() can throw in rare embedded environments.
  try {
    musicEl = new Audio(musicPath);
  } catch {
    musicEl = null;
  }

  if (!musicEl) return;

  musicEl.loop = true;
  musicEl.preload = "auto";

  // Do not remove or replace the existing AETHORA background music.
  // Browser autoplay policies may block playback until the user interacts.
  musicEl.addEventListener("error", () => {
    // Missing/broken asset: stop retrying play() on every interaction.
    musicLoadFailed = true;
    removeMusicRetryListeners();
  });

  applyMusicState();

  void musicEl.play().catch(() => undefined);

  // P0.1 fix: the old retry used `once: true`, so a single interaction
  // (even one that happened while muted, or a gesture the browser ignored)
  // consumed the only retry forever. Retry on every interaction until the
  // music is actually playing.
  addMusicRetryListeners();

  // Mobile browsers suspend media when the app is backgrounded. When the
  // user returns, restart the theme if it should be audible.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      tryStartMusic();
    }
  });

  listeners.add(applyMusicState);
}

/* -------------------------------------------------------------------------- */
/* Character INTRO sounds                                                      */
/*                                                                            */
/* IMPORTANT: These are NOT talking sounds.                                  */
/* They play once when the character enters/appears in a quest.              */
/* -------------------------------------------------------------------------- */

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * King:
 * Deep royal fanfare / brass-like entrance.
 */
function playKingIntro(ctx: AudioContext, master: GainNode) {
  tone(98, 0, 0.32, ctx, master, "sawtooth", 0.32);
  tone(146.83, 0.03, 0.28, ctx, master, "triangle", 0.28);
  tone(196, 0.1, 0.38, ctx, master, "triangle", 0.3);
  tone(293.66, 0.22, 0.5, ctx, master, "sawtooth", 0.22);
}

/**
 * Maid:
 * Soft elegant magical bell.
 */
function playMaidIntro(ctx: AudioContext, master: GainNode) {
  const base = 520 + rand(-12, 12);

  tone(base, 0, 0.22, ctx, master, "sine", 0.32);
  tone(base * 1.5, 0.08, 0.32, ctx, master, "sine", 0.24);
  tone(base * 2, 0.16, 0.42, ctx, master, "sine", 0.18);
}

/**
 * Scientist:
 * Small alchemical / magical experiment sound.
 */
function playScientistIntro(ctx: AudioContext, master: GainNode) {
  const base = 280 + rand(-20, 20);

  tone(base, 0, 0.14, ctx, master, "sine", 0.3);
  tone(base * 1.5, 0.09, 0.15, ctx, master, "sine", 0.28);
  tone(base * 2.2, 0.18, 0.18, ctx, master, "triangle", 0.25);
  tone(base * 1.2, 0.28, 0.28, ctx, master, "sine", 0.18);
}

/**
 * Wizard:
 * Magical ascending arcane sparkle.
 */
function playWizardIntro(ctx: AudioContext, master: GainNode) {
  const osc = ctx.createOscillator();
  const envelope = ctx.createGain();

  const startTime = ctx.currentTime;

  osc.type = "triangle";

  osc.frequency.setValueAtTime(240 + rand(-10, 10), startTime);
  osc.frequency.exponentialRampToValueAtTime(
    720 + rand(-20, 20),
    startTime + 0.35,
  );

  envelope.gain.setValueAtTime(0.0001, startTime);
  envelope.gain.linearRampToValueAtTime(0.3, startTime + 0.04);
  envelope.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

  osc.connect(envelope);
  envelope.connect(master);

  osc.start(startTime);
  osc.stop(startTime + 0.45);

  tone(960, 0.22, 0.14, ctx, master, "sine", 0.18);
  tone(1320, 0.32, 0.18, ctx, master, "sine", 0.14);
}

/**
 * Adventurer:
 * Short metallic sword / steel impact.
 */
function playAdventurerIntro(ctx: AudioContext, master: GainNode) {
  const osc = ctx.createOscillator();
  const envelope = ctx.createGain();

  const startTime = ctx.currentTime;

  osc.type = "square";

  osc.frequency.setValueAtTime(1600 + rand(-100, 100), startTime);
  osc.frequency.exponentialRampToValueAtTime(
    420,
    startTime + 0.18,
  );

  envelope.gain.setValueAtTime(0.0001, startTime);
  envelope.gain.linearRampToValueAtTime(0.25, startTime + 0.005);
  envelope.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

  osc.connect(envelope);
  envelope.connect(master);

  osc.start(startTime);
  osc.stop(startTime + 0.22);

  tone(2100, 0, 0.07, ctx, master, "triangle", 0.18);
  tone(2800, 0.025, 0.08, ctx, master, "sine", 0.12);
}

/**
 * Light / sacred / friendly character:
 * Gentle sparkle.
 */
function playLightIntro(ctx: AudioContext, master: GainNode) {
  tone(660 + rand(-15, 15), 0, 0.16, ctx, master, "sine", 0.25);
  tone(990 + rand(-15, 15), 0.08, 0.22, ctx, master, "sine", 0.2);
  tone(1320 + rand(-20, 20), 0.17, 0.3, ctx, master, "triangle", 0.14);
}

type CharacterIntroFn = (
  ctx: AudioContext,
  master: GainNode,
) => void;

/**
 * Keep these IDs compatible with the existing character system.
 *
 * Unknown IDs intentionally use the light/friendly intro rather than
 * pretending the character is the maid.
 */
const CHARACTER_INTROS: Record<string, CharacterIntroFn> = {
  king: playKingIntro,
  maid: playMaidIntro,
  scientist: playScientistIntro,
  wizard: playWizardIntro,
  adventurer: playAdventurerIntro,
  sacred: playLightIntro,
  meri: playLightIntro,
  hakari: playLightIntro,
};

/* -------------------------------------------------------------------------- */
/* Character intro playback                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Play ONE character entrance sound.
 *
 * This function does NOT depend on dialogue text.
 * It should be called by the quest/character component exactly once
 * when a character first appears for that quest session.
 */
const INTRO_COOLDOWN_MS = 400;
const lastIntroPlayedAt = new Map<string, number>();

export function playCharacterIntro(characterId: string) {
  if (state.muted) return;
  if (typeof window === "undefined") return;

  // P0.1 hardening: a character entering can trigger multiple intro calls in
  // quick succession (re-renders, fast dialogue advance). Play at most one
  // entrance sound per character within the cooldown window.
  const now = Date.now();
  const last = lastIntroPlayedAt.get(characterId) ?? 0;

  if (now - last < INTRO_COOLDOWN_MS) return;

  lastIntroPlayedAt.set(characterId, now);

  const ctx = getCtx();
  if (!ctx) return;

  void resumeAudioContext(ctx).then((ready) => {
    if (!ready || state.muted) return;

    try {
      const master = createMaster(ctx, 0.45);

      const intro =
        CHARACTER_INTROS[characterId] ??
        playLightIntro;

      intro(ctx, master);
    } catch {
      // Never let an intro sound propagate an exception to the caller.
    }
  });
}

