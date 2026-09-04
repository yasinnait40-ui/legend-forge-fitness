import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CHARACTERS,
  characterDialogue,
  resolveCharacterId,
  type CharacterId,
  type LegacyCharacterId,
} from "@/lib/characters";
import { useGame } from "@/lib/game-store";
import { speakCharacterLine } from "@/lib/character-voice";

export type FantasyCharacterKind = CharacterId | LegacyCharacterId;

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
  const resolvedDialogue = dialogue ?? characterDialogue(id, game, t);
  const lines = useMemo(() => {
    if (typeof resolvedDialogue !== "string") return resolvedDialogue ? [resolvedDialogue] : [];
    return resolvedDialogue
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [resolvedDialogue]);

  useEffect(() => {
    setLineIndex(0);
    setVisible(Boolean(resolvedDialogue));
    if (!resolvedDialogue) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [resolvedDialogue]);

  useEffect(() => {
    if (visible && lines[lineIndex]) {
      speakCharacterLine(id, lines[lineIndex], "en");
    }
  }, [visible, lineIndex, lines, id]);

  const advance = () => {
    if (lineIndex < lines.length - 1) setLineIndex((current) => current + 1);
    else setVisible(false);
  };
  const name = t(character.nameKey);
  const role = t(character.roleKey);

  return (
    <aside
      className={`fantasy-character fantasy-character-${id} ${embedded ? "fantasy-character-embedded" : ""} ${visible ? "is-entered" : ""}`}
      style={{ "--character-accent": character.accent } as CSSProperties}
      aria-label={`${name}, ${role}`}
    >
      <div className="fantasy-character-figure">
        <img
          src={character.artwork.src}
          alt={t(character.artwork.altKey)}
          className="fantasy-character-art"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
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