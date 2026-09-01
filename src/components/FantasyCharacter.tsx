import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

export type FantasyCharacterKind =
  | "king"
  | "adventurer"
  | "maid"
  | "wizard"
  | "sacred"
  | "scientist";

const META: Record<FantasyCharacterKind, { name: string; role: string; accent: string }> = {
  king: { name: "The King", role: "Royal guide", accent: "var(--primary)" },
  adventurer: { name: "The Adventurer", role: "Guild companion", accent: "var(--stat-strength)" },
  maid: { name: "The Maid", role: "Chamber steward", accent: "var(--stat-vitality)" },
  wizard: { name: "The Ancient Wizard", role: "Arcane mentor", accent: "var(--accent)" },
  sacred: { name: "The Sacred Fox", role: "Sanctuary spirit", accent: "var(--stat-agility)" },
  scientist: { name: "The Scientist", role: "Trial researcher", accent: "var(--stat-endurance)" },
};

const ARTWORK: Record<FantasyCharacterKind, { src: string; alt: string }> = {
  king: { src: "/characters/king.png", alt: "Regal fantasy king in golden armor" },
  adventurer: { src: "/characters/adventurer.png", alt: "Fantasy adventurer in leather armor with bow and dagger" },
  maid: { src: "/characters/maid.png", alt: "Elegant fantasy maid in royal servant attire" },
  wizard: { src: "/characters/wizard.png", alt: "Ancient wizard holding a glowing crystal staff" },
  sacred: { src: "/characters/sacred.png", alt: "Serene sacred priestess in white and gold robes" },
  scientist: { src: "/characters/scientist.png", alt: "Arcane fantasy scientist with a magical device and tome" },
};

function CharacterArt({ kind }: { kind: FantasyCharacterKind }) {
  const artwork = ARTWORK[kind];
  return <img src={artwork.src} alt={artwork.alt} className="fantasy-character-art" />;
}

export function FantasyCharacter({ kind, dialogue }: { kind: FantasyCharacterKind; dialogue?: ReactNode }) {
  const [entered, setEntered] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const meta = META[kind];
  const lines = useMemo(() => {
    if (typeof dialogue !== "string") return dialogue ? [dialogue] : [];
    return dialogue.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  }, [dialogue]);

  useEffect(() => {
    const enterFrame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(enterFrame);
  }, []);

  useEffect(() => {
    setLineIndex(0);
    setDismissed(false);
    setEntered(true);
  }, [dialogue]);

  const advanceDialogue = () => {
    if (lineIndex < lines.length - 1) {
      setLineIndex((current) => current + 1);
      return;
    }
    setDismissed(true);
    setEntered(false);
  };
  return (
    <aside className={`fantasy-character fantasy-character-${kind} ${entered && !dismissed ? "is-entered" : ""}`} style={{ "--character-accent": meta.accent } as CSSProperties} aria-label={meta.name}>
      <div className="fantasy-character-figure"><CharacterArt kind={kind} /><span className="fantasy-character-sigil" /></div>
      <button type="button" className="fantasy-character-dialogue" onClick={advanceDialogue} aria-label={lineIndex < lines.length - 1 ? "Advance dialogue" : "Dismiss dialogue"}>
        <span className="font-display text-[0.62rem] uppercase tracking-[0.2em] text-primary">{meta.name}</span>
        <span className="mt-1 block text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">{meta.role}</span>
        {lines.length > 0 && <span className="mt-2 block text-left text-sm leading-relaxed text-foreground">{lines[lineIndex]}</span>}
        <span className="fantasy-character-continue" aria-hidden="true">▼</span>
      </button>
    </aside>
  );
}

export function CharacterWelcome({ kind, dialogue }: { kind: FantasyCharacterKind; dialogue: string }) {
  return <FantasyCharacter kind={kind} dialogue={dialogue} />;
}

export default FantasyCharacter;
