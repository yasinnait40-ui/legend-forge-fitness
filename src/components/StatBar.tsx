import { STAT_CAP, type StatKey } from "@/lib/game-data";
import { useGameText } from "@/lib/game-i18n";

const STAT_COLORS: Record<StatKey, string> = {
  strength: "var(--stat-strength)",
  endurance: "var(--stat-endurance)",
  agility: "var(--stat-agility)",
  vitality: "var(--stat-vitality)",
  recovery: "var(--stat-recovery)",
};

export function StatBar({ stat, value, label }: { stat: StatKey; value: number; label?: string }) {
  const color = STAT_COLORS[stat];
  const g = useGameText();
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {label ?? g.stat(stat)}
        </span>
        <span className="font-display text-sm font-bold" style={{ color }}>
          {value}
        </span>
      </div>
      <div className="bar-track">
        <div
          className="bar-fill"
          style={{
            width: `${Math.min(100, (value / STAT_CAP) * 100)}%`,
            background: `linear-gradient(90deg, color-mix(in oklab, ${color} 45%, black 30%), ${color})`,
            boxShadow: `0 0 12px color-mix(in oklab, ${color} 60%, transparent)`,
          }}
        />
      </div>
    </div>
  );
}
