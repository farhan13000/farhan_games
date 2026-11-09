import { useMemo, type CSSProperties } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const COLORS = ['#6C5CF5', '#F2456A', '#1597E5', '#FFC542', '#2BD9A0', '#A9A2FF'];

/** Lightweight CSS confetti burst; skipped entirely for reduced-motion users. */
export function Confetti({ burstKey }: { burstKey: string | number }) {
  const reduced = useReducedMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        id: `${burstKey}-${i}`,
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        duration: 2.2 + Math.random() * 1.6,
        drift: (Math.random() - 0.5) * 240,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 6,
        round: Math.random() > 0.6,
      })),
    [burstKey],
  );
  if (reduced) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 animate-confetti"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              borderRadius: p.round ? '999px' : '2px',
              background: p.color,
              animationDelay: `${p.delay}s`,
              '--duration': `${p.duration}s`,
              '--drift': `${p.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
