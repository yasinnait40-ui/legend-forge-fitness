import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CHARACTERS,
  characterDialogue,
  resolveCharacterId,
  type CharacterId,
  type LegacyCharacterId,
} from "@/lib/characters";
import { useGame } from "@/lib/game-store";
import { playCharacterIntro } from "@/lib/sound-store";
import {
  subscribeCharacterReactions,
  type CharacterReaction,
  type CharacterReactionKind,
} from "@/lib/character-reactions";
import { cn } from "@/lib/utils";

export type FantasyCharacterKind = CharacterId | LegacyCharacterId;

/*
 * PRESENCE SYSTEM — per-character idle personalities.
 *
 * Every character gets their own slow, GPU-friendly idle loop (transform +
 * opacity only). No two idle styles are the same so the roster reads as a
 * cast of NPCs rather than copies of one sprite.
 *
 *  king        — slow, confident sway + gentle breathing (authority)
 *  adventurer  — livelier breath with a light stance shift (energy)
 *  scholar     — precise, even breathing with a subtle head-side tilt
 *  sage        — barely-there float with a slow mystical sway (magic)
 *  hero        — warm, steady breathing with a small encouraging lean
 *  hakari      — cheerful bobbing float (small sacred companion)
 *  miri        — graceful side-drift float, distinct from Hakari
 *  maid        — composed, elegant, near-imperceptible sway
 */
const IDLE_CLASS: Record<CharacterId, string> = {
  king: "char-idle-king",
  adventurer: "char-idle-adventurer",
  scholar: "char-idle-scholar",
  sage: "char-idle-sage",
  hero: "char-idle-hero",
  hakari: "char-idle-hakari",
  miri: "char-idle-miri",
  maid: "char-idle-maid",
};

/** Characters whose idle includes a float — their ground shadow softens. */
const FLOATING: CharacterId[] = ["hakari", "miri", "sage"];

/** How long a reaction animation stays on the figure (matches CSS timing). */
const REACTION_MS = 1150;

/** Map a reaction event to a duration bucket so multiple events feel varied. */
const REACTION_CLASS: Record<CharacterReactionKind, string> = {
  "quest-accepted": "char-react-nod",
  "quest-complete": "char-react-triumph",
  "level-up": "char-react-levelup",
  achievement: "char-react-triumph",
  streak: "char-react-nod",
  reward: "char-react-glow",
};

export function FantasyCharacter({
  kind,
  dialogue,
  embedded = false,
}: {
  kind: FantasyCharacterKind;
  dialogue?: ReactNode;
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  const game = useGame();

  const id = resolveCharacterId(kind);
  const character = CHARACTERS[id];

  const [visible, setVisible] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [reaction, setReaction] = useState<CharacterReaction | null>(null);

  /*
   * Prevent the intro sound from playing repeatedly because of:
   * - React re-renders
   * - dialogue changes
   * - translation changes
   * - game-store updates
   */
  const introPlayedRef = useRef<string | null>(null);
  const speakTimerRef = useRef<number | null>(null);
  const reactionTimerRef = useRef<number | null>(null);

  const resolvedDialogue = dialogue ?? characterDialogue(id, game, t);

  const lines = useMemo(() => {
    if (typeof resolvedDialogue !== "string") {
      return resolvedDialogue ? [resolvedDialogue] : [];
    }

    return resolvedDialogue
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [resolvedDialogue]);

  /*
   * Character visibility / dialogue lifecycle.
   */
  useEffect(() => {
    setLineIndex(0);
    setVisible(Boolean(resolvedDialogue));

    if (!resolvedDialogue) return;

    const frame = requestAnimationFrame(() => {
      setVisible(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [resolvedDialogue]);

  /*
   * SPEAKING STATE
   *
   * While a line is on screen the figure leans toward its dialogue (a tiny
   * accent-colored emphasis) and the nameplate lights up. It clears when the
   * dialogue is dismissed so the character returns to pure idle.
   */
  useEffect(() => {
    setSpeaking(visible && lines.length > 0);
    return () => {
      if (speakTimerRef.current !== null) {
        window.clearTimeout(speakTimerRef.current);
        speakTimerRef.current = null;
      }
    };
  }, [visible, lines.length]);

  useEffect(
    () => () => {
      if (reactionTimerRef.current !== null) window.clearTimeout(reactionTimerRef.current);
    },
    [],
  );

  /*
   * CHARACTER REACTIONS
   *
   * Gameplay systems publish events; the mounted character plays one short
   * animation. Reactions never stack — a newer event replaces an older one.
   */
  useEffect(() => {
    return subscribeCharacterReactions((next) => {
      setReaction(next);
      if (reactionTimerRef.current !== null) window.clearTimeout(reactionTimerRef.current);
      reactionTimerRef.current = window.setTimeout(() => setReaction(null), REACTION_MS);
    });
  }, []);

  /*
   * CHARACTER INTRO SOUND
   *
   * Play exactly ONE sound when this character enters.
   *
   * IMPORTANT:
   * This is completely independent from dialogue.
   * Clicking the dialogue box will NEVER trigger another
   * character sound.
   */
  useEffect(() => {
    if (!visible) return;
    if (!resolvedDialogue) return;

    /*
     * Only play once for this character while this component
     * instance is alive.
     */
    if (introPlayedRef.current === id) return;

    introPlayedRef.current = id;
    playCharacterIntro(id);
  }, [visible, resolvedDialogue, id]);

  const advance = () => {
    if (lineIndex < lines.length - 1) {
      setLineIndex((current) => current + 1);
    } else {
      setVisible(false);
      setSpeaking(false);
    }
  };

  const name = t(character.nameKey);
  const role = t(character.roleKey);

  const idleClass = IDLE_CLASS[id] ?? "";
  const reactionClass = reaction ? REACTION_CLASS[reaction.kind] : "";
  const floating = FLOATING.includes(id);

  const companionDialogueClass = id === "hakari" || id === "miri" ? " companion-dialogue" : "";

  return (
    <aside
      className={cn(
        "fantasy-character",
        `fantasy-character-${id}`,
        embedded && "fantasy-character-embedded",
        visible && "is-entered",
        speaking && "is-speaking",
      )}
      style={
        {
          "--character-accent": character.accent,
        } as CSSProperties
      }
      aria-label={`${name}, ${role}`}
    >
      <div className="fantasy-character-figure">
        {/* Ambient aura glow behind the character */}
        <div className="char-aura" aria-hidden="true" />
        {/* Backlight halo — separates the figure from the backdrop (depth) */}
        <div className="char-rim-light" aria-hidden="true" />
        <img
          src={character.artwork.src}
          alt={t(character.artwork.altKey)}
          className={cn(
            "fantasy-character-art",
            idleClass,
            reactionClass && `char-reacting ${reactionClass}`,
          )}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        {/* Ground shadow for physical presence — floats get a softer, wider pool */}
        <div
          className={cn("char-ground-shadow", floating && "char-ground-shadow-float")}
          aria-hidden="true"
        />
      </div>

      <button
        type="button"
        className={cn("fantasy-character-dialogue", companionDialogueClass)}
        onClick={advance}
        aria-label={
          lineIndex < lines.length - 1
            ? t("characters.actions.advance")
            : t("characters.actions.dismiss")
        }
      >
        <span className="fantasy-character-nameplate">
          <strong>{name}</strong>
          <small>{role}</small>
        </span>

        {lines.length > 0 && (
          <span className="fantasy-character-line" key={lineIndex}>
            {lines[lineIndex]}
          </span>
        )}

        <span className="fantasy-character-continue" aria-hidden="true">
          {lineIndex < lines.length - 1 ? "▼" : "✕"}
        </span>
      </button>
    </aside>
  );
}

export function CharacterWelcome({
  kind,
  dialogue,
}: {
  kind: FantasyCharacterKind;
  dialogue?: string;
}) {
  return <FantasyCharacter kind={kind} dialogue={dialogue} />;
}

export default FantasyCharacter;
