// Zero-friction onboarding: name, goal, training days, session duration.
// Stored locally so the first 60 seconds never require an account.

import { useSyncExternalStore } from "react";

export type GoalId = "lose-fat" | "build-muscle" | "improve-fitness" | "general-health";

export interface OnboardingProfile {
  name: string;
  goal: GoalId;
  trainingDays: number; // days per week, 1-7
  sessionMinutes: number; // preferred session length
  completedAt: string; // ISO timestamp
}

const STORAGE_KEY = "aethora-onboarding-v1";

let profile: OnboardingProfile | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Load the saved profile once on the client. */
export function hydrateOnboarding() {
  if (profile) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<OnboardingProfile>;
      if (parsed && typeof parsed.completedAt === "string") {
        profile = {
          name: typeof parsed.name === "string" ? parsed.name.slice(0, 40) : "",
          goal: (parsed.goal as GoalId) ?? "general-health",
          trainingDays: Math.min(7, Math.max(1, parsed.trainingDays ?? 3)),
          sessionMinutes: Math.min(90, Math.max(10, parsed.sessionMinutes ?? 30)),
          completedAt: parsed.completedAt,
        };
      }
    }
  } catch {
    profile = null;
  }
  emit();
}

export function getOnboardingProfile(): OnboardingProfile | null {
  return profile;
}

export function completeOnboarding(input: Omit<OnboardingProfile, "completedAt">) {
  profile = { ...input, completedAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // storage unavailable — keep in memory for this session
  }
  emit();
}

export function resetOnboarding() {
  profile = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  emit();
}

export function useOnboarding(): OnboardingProfile | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => profile,
    () => null,
  );
}
