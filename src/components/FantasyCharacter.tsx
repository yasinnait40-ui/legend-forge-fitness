"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

export type FantasyCharacterKind = "king" | "adventurer" | "maid" | "wizard" | "sacred" | "scientist" | "sprite";

const META: Record<FantasyCharacterKind, { name: string; role: string; accent: string }> = {
  king: { name: "The King", role: "Royal guide", accent: "var(--primary)" },
  adventurer: { name: "The Adventurer", role: "Guild companion", accent: "var(--stat-strength)" },
  maid: { name: "The Maid", role: "Chamber steward", accent: "var(--stat-vitality)" },
  wizard: { name: "The Ancient Wizard", role: "Arcane mentor", accent: "var(--accent)" },
  sacred: { name: "The Sacred Guardian", role: "Sanctuary protector", accent: "var(--stat-agility)" },
  scientist: { name: "The Scientist", role: "Trial researcher", accent: "var(--stat-endurance)" },
  sprite: { name: "Miri", role: "Little magic monster", accent: "var(--accent)" },
};

const ARTWORK: Record<FantasyCharacterKind, { src: string; alt: string }> = {
  king: { src: "/characters/king.png", alt: "Young golden-haired king in red and gold regalia" },
  adventurer: { src: "/characters/adventurer.png", alt: "Hooded ember-eyed fantasy adventurer" },
  maid: { src: "/characters/maid.png", alt: "Elegant fantasy maid with a classic headdress" },
  wizard: { src: "/characters/wizard.png", alt: "Ancient wizard in red and blue robes" },
  sacred: { src: "/characters/sacred.png", alt: "Stoic silver-haired guardian with an eyepatch" },
  scientist: { src: "/characters/scientist.png", alt: "Rugged fantasy alchemist surrounded by vials" },
  sprite: { src: "/characters/sprite.png", alt: "Miri, a cute little glowing magic monster" },
};

export function FantasyCharacter({ kind, dialogue }: { kind: FantasyCharacterKind; dialogue?: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const meta = META[kind];
  const lines = useMemo(() => {
    if (typeof dialogue !== "string") return dialogue ? [dialogue] : [];
    return dialogue.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  }, [dialogue]);

  useEffect(() => {
    setLineIndex(0);
    setVisible(Boolean(dialogue));
    if (!dialogue) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [dialogue]);

  const advance = () => {
    if (lineIndex < lines.length - 1) setLineIndex((current) => current + 1);
    else setVisible(false);
  };

  return (
    <aside className={`fantasy-character fantasy-character-${kind} ${visible ? "is-entered" : ""}`} style={{ "--character-accent": meta.accent } as CSSProperties} aria-label={meta.name}>
      <div className="fantasy-character-figure"><img src={ARTWORK[kind].src} alt={ARTWORK[kind].alt} className="fantasy-character-art" /></div>
      <button type="button" className="fantasy-character-dialogue" onClick={advance} aria-label={lineIndex < lines.length - 1 ? "Advance dialogue" : "Dismiss dialogue"}>
        <span className="fantasy-character-nameplate"><strong>{meta.name}</strong><small>{meta.role}</small></span>
        {lines.length > 0 && <span className="fantasy-character-line">{lines[lineIndex]}</span>}
        <span className="fantasy-character-continue" aria-hidden="true">▼</span>
      </button>
    </aside>
  );
}

export function CharacterWelcome({ kind, dialogue }: { kind: FantasyCharacterKind; dialogue: string }) {
  return <FantasyCharacter kind={kind} dialogue={dialogue} />;
}

export default FantasyCharacter;
