// Floating magical embers — deterministic positions so SSR and client match.
const EMBERS = [
  { left: 6, delay: 0, duration: 12, size: 4 },
  { left: 13, delay: 4.1, duration: 14, size: 3 },
  { left: 21, delay: 1.8, duration: 10, size: 5 },
  { left: 29, delay: 6.3, duration: 13, size: 3 },
  { left: 37, delay: 2.6, duration: 11, size: 4 },
  { left: 45, delay: 8.2, duration: 15, size: 3 },
  { left: 52, delay: 0.9, duration: 12, size: 5 },
  { left: 60, delay: 5.4, duration: 10, size: 3 },
  { left: 68, delay: 3.1, duration: 14, size: 4 },
  { left: 76, delay: 7.5, duration: 11, size: 3 },
  { left: 84, delay: 1.2, duration: 13, size: 5 },
  { left: 92, delay: 5.9, duration: 12, size: 3 },
  { left: 17, delay: 9.4, duration: 15, size: 3 },
  { left: 57, delay: 10.6, duration: 14, size: 4 },
] as const;

export function Particles({ count = 12 }: { count?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {EMBERS.slice(0, count).map((e, i) => (
        <span
          key={i}
          className="ember"
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            animationDuration: `${e.duration}s`,
            animationDelay: `${e.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
