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

export type FantasyCharacterKind = CharacterId | LegacyCharacterId;

// Characters that should have the floating animation (companions, magical beings)
const FLOATING_CHARACTERS: CharacterId[] = ["hakari", "miri", "sage"];
// Characters that should have a breathing animation (alive, grounded NPCs)
const BREATHING_CHARACTERS: CharacterId[] = ["king", "adventurer", "hero", "scholar"];

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

  /*
   * Prevent the intro sound from playing repeatedly because of:
   * - React re-renders
   * - dialogue changes
   * - translation changes
   * - game-store updates
   */
  const introPlayedRef = useRef<string | null>(null);

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
    }
  };

  const name = t(character.nameKey);
  const role = t(character.roleKey);

  // Determine animation class for the character figure
  const figureAnimationClass = FLOATING_CHARACTERS.includes(id)
    ? "char-float"
    : BREATHING_CHARACTERS.includes(id)
      ? "char-breathe"
      : "";

  return (
    <aside
      className={`fantasy-character fantasy-character-${id} ${
        embedded ? "fantasy-character-embedded" : ""
      } ${visible ? "is-entered" : ""}`}
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
        <img
          src={character.artwork.src}
          alt={t(character.artwork.altKey)}
          className={`fantasy-character-art ${figureAnimationClass}`}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        {/* Ground shadow for physical presence */}
        <div className="char-ground-shadow" aria-hidden="true" />
      </div>

      <button
        type="button"
        className="fantasy-character-dialogue"
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

        {lines.length > 0 && <span className="fantasy-character-line">{lines[lineIndex]}</span>}

        <span className="fantasy-character-continue" aria-hidden="true">
          ▼
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
