import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";

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

function CharacterArt({ kind }: { kind: FantasyCharacterKind }) {
  if (kind === "sacred") {
    return (
      <svg viewBox="0 0 240 260" aria-hidden="true" className="fantasy-character-art">
        <path d="M42 175c-23-38 5-91 51-99 54-10 91 27 85 76-5 42-53 62-94 52-18-4-32-13-42-29Z" fill="color-mix(in oklab, var(--accent) 48%, var(--background))" stroke="var(--primary)" strokeWidth="4" />
        <path d="m64 89-7-48 39 30m46 17 27-46 11 58" fill="color-mix(in oklab, var(--accent) 38%, var(--background))" stroke="var(--primary)" strokeWidth="4" strokeLinejoin="round" />
        <path d="M76 138c8-19 30-31 52-30 23 1 39 13 45 32-12 18-30 28-52 28-21 0-37-10-45-30Z" fill="var(--card)" />
        <circle cx="105" cy="137" r="5" fill="var(--primary)" /><circle cx="143" cy="137" r="5" fill="var(--primary)" />
        <path d="M119 151q5 8 11 0M177 169c42-5 49-40 26-59 4 29-14 34-35 28" fill="none" stroke="var(--primary)" strokeWidth="7" strokeLinecap="round" />
        <path d="M68 184q50 28 108-2" fill="none" stroke="var(--primary)" strokeWidth="3" strokeDasharray="4 8" opacity=".8" />
      </svg>
    );
  }
  const heads: Record<Exclude<FantasyCharacterKind, "sacred">, { hair: string; robe: string; accent: string }> = {
    king: { hair: "var(--primary)", robe: "var(--accent)", accent: "var(--primary)" },
    adventurer: { hair: "var(--stat-strength)", robe: "var(--stat-endurance)", accent: "var(--stat-strength)" },
    maid: { hair: "var(--foreground)", robe: "var(--stat-vitality)", accent: "var(--primary)" },
    wizard: { hair: "var(--foreground)", robe: "var(--accent)", accent: "var(--accent)" },
    scientist: { hair: "var(--stat-endurance)", robe: "var(--foreground)", accent: "var(--stat-endurance)" },
  };
  const palette = heads[kind];
  const isKing = kind === "king";
  const isWizard = kind === "wizard";
  return (
    <svg viewBox="0 0 240 300" aria-hidden="true" className="fantasy-character-art">
      {isKing && <path d="m66 61 18-37 35 22 36-22 18 37" fill="none" stroke="var(--primary)" strokeWidth="8" strokeLinejoin="round" />}
      {isWizard && <path d="M53 78 120 9l68 69-28-9-40 22-40-22Z" fill={palette.robe} stroke={palette.accent} strokeWidth="4" />}
      <circle cx="120" cy="93" r="41" fill="color-mix(in oklab, var(--foreground) 65%, var(--background))" stroke={palette.accent} strokeWidth="4" />
      <path d="M79 87q7-48 42-48 37 0 42 48-23-22-84 0Z" fill={palette.hair} opacity=".9" />
      <circle cx="105" cy="96" r="4" fill="var(--background)" /><circle cx="136" cy="96" r="4" fill="var(--background)" />
      <path d="M111 112q9 7 18 0" fill="none" stroke="var(--background)" strokeWidth="3" strokeLinecap="round" />
      <path d="M72 271q5-100 48-111 43 11 48 111Z" fill={palette.robe} stroke={palette.accent} strokeWidth="5" />
      <path d="M97 159v52l23 18 23-18v-52" fill={palette.accent} opacity=".32" />
      <path d="M83 190 42 240m115-50 41 50" fill="none" stroke={palette.robe} strokeWidth="24" strokeLinecap="round" />
      {kind === "maid" && <path d="M66 62q54-37 108 0" fill="none" stroke="var(--foreground)" strokeWidth="8" />}
      {kind === "scientist" && <path d="M160 92h24v30h-24Z" fill="none" stroke={palette.accent} strokeWidth="4" />}
      {isWizard && <circle cx="182" cy="196" r="13" fill="none" stroke="var(--primary)" strokeWidth="3" />}
    </svg>
  );
}

export function FantasyCharacter({ kind, dialogue }: { kind: FantasyCharacterKind; dialogue?: ReactNode }) {
  const [entered, setEntered] = useState(false);
  const meta = META[kind];
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <aside className={`fantasy-character fantasy-character-${kind} ${entered ? "is-entered" : ""}`} style={{ "--character-accent": meta.accent } as CSSProperties} aria-label={meta.name}>
      <div className="fantasy-character-figure"><CharacterArt kind={kind} /><span className="fantasy-character-sigil" /></div>
      <div className="fantasy-character-dialogue rune-panel-soft">
        <p className="font-display text-[0.62rem] uppercase tracking-[0.2em] text-primary">{meta.name}</p>
        <p className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">{meta.role}</p>
        {dialogue && <p className="mt-2 text-sm leading-relaxed text-foreground">{dialogue}</p>}
      </div>
    </aside>
  );
}

export function CharacterWelcome({ kind, dialogue }: { kind: FantasyCharacterKind; dialogue: string }) {
  return <FantasyCharacter kind={kind} dialogue={dialogue} />;
}

export default FantasyCharacter;
