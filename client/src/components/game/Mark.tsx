import clsx from 'clsx';
import type { Mark as MarkType } from '@arena/shared';

interface MarkProps {
  mark: MarkType;
  className?: string;
  animate?: boolean;
  /** Render as a faint preview (hover ghost). */
  ghost?: boolean;
  strokeWidth?: number;
}

/** X and O drawn as SVG strokes so identity never depends on color alone. */
export function Mark({
  mark,
  className,
  animate = false,
  ghost = false,
  strokeWidth = 13,
}: MarkProps) {
  const stroke = mark === 'X' ? '#F2456A' : '#1597E5';
  const anim = animate ? 'mark-stroke animate-draw' : undefined;
  return (
    <svg
      viewBox="0 0 100 100"
      className={clsx('block', ghost && 'opacity-25', className)}
      aria-hidden="true"
      focusable="false"
    >
      {mark === 'X' ? (
        <>
          <path
            d="M24 24 L76 76"
            pathLength={100}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            className={anim}
          />
          <path
            d="M76 24 L24 76"
            pathLength={100}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            className={anim}
            style={animate ? { animationDelay: '120ms' } : undefined}
          />
        </>
      ) : (
        <circle
          cx="50"
          cy="50"
          r="27"
          pathLength={100}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          className={anim}
          transform="rotate(-90 50 50)"
        />
      )}
    </svg>
  );
}

export function MarkBadge({ mark, className }: { mark: MarkType; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-xl',
        mark === 'X' ? 'bg-xmark-light' : 'bg-omark-light',
        className ?? 'h-8 w-8',
      )}
    >
      <Mark mark={mark} className="h-[70%] w-[70%]" strokeWidth={15} />
      <span className="sr-only">{mark}</span>
    </span>
  );
}
