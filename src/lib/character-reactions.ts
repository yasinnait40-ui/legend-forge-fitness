/*
 * CHARACTER REACTION EVENTS
 *
 * A tiny module-level event layer. Game systems (quest completion, trials,
 * level ups, achievements, treasure, streaks) publish what just happened and
 * any mounted <FantasyCharacter> plays a short reaction animation.
 *
 * Zero React state, zero re-renders of the game store, zero timers per frame:
 * each event is a single CSS class toggled on the character figure for ~1.2s.
 */

export type CharacterReactionKind =
  "quest-accepted" | "quest-complete" | "level-up" | "achievement" | "streak" | "reward";

export interface CharacterReaction {
  kind: CharacterReactionKind;
  /** Monotonic id so identical kinds in a row still re-trigger. */
  seq: number;
}

type ReactionListener = (reaction: CharacterReaction) => void;

const listeners = new Set<ReactionListener>();
let seq = 0;

/** Fire a reaction to every mounted character. Cheap and rare by design. */
export function emitCharacterReaction(kind: CharacterReactionKind): void {
  seq += 1;
  const reaction: CharacterReaction = { kind, seq };
  listeners.forEach((l) => l(reaction));
}

export function subscribeCharacterReactions(fn: ReactionListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
