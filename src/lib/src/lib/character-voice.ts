import { getSoundState } from "@/lib/sound-store";

export interface VoiceProfile {
  pitch: number;
  rate: number;
}

const VOICE_PROFILES: Record<string, VoiceProfile> = {
  king: { pitch: 0.75, rate: 0.92 },
  adventurer: { pitch: 0.95, rate: 1.08 },
  scientist: { pitch: 1.0, rate: 1.0 },
  wizard: { pitch: 0.65, rate: 0.85 },
  sacred: { pitch: 0.8, rate: 0.95 },
  maid: { pitch: 1.25, rate: 1.05 },
};

const LANG_VOICE_CODES: Record<string, string> = {
  en: "en-US",
  ar: "ar-SA",
  ja: "ja-JP",
  es: "es-ES",
  fr: "fr-FR",
};

export function speakCharacterLine(characterId: string, text: string, langCode: string) {
  const { muted, volume } = getSoundState();
  if (muted) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const profile = VOICE_PROFILES[characterId] ?? { pitch: 1, rate: 1 };
  utterance.pitch = profile.pitch;
  utterance.rate = profile.rate;
  utterance.volume = volume;
  utterance.lang = LANG_VOICE_CODES[langCode] ?? "en-US";
  window.speechSynthesis.speak(utterance);
}