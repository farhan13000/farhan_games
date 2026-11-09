import clsx from 'clsx';
import { useEffect, useState } from 'react';
import type { Mark as MarkType } from '@arena/shared';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Mark } from './Mark';

// A short scripted game: X wins on the anti-diagonal.
const SCRIPT: Array<[number, MarkType]> = [
  [4, 'X'],
  [0, 'O'],
  [2, 'X'],
  [8, 'O'],
  [6, 'X'],
];
const WIN = [2, 4, 6];

/** Decorative, looping demo board for the landing page hero. */
export function HeroBoard() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(reduced ? SCRIPT.length : 0);

  useEffect(() => {
    if (reduced) {
      setStep(SCRIPT.length);
      return;
    }
    const delay = step >= SCRIPT.length ? 2200 : step === 0 ? 700 : 750;
    const t = setTimeout(() => setStep((s) => (s >= SCRIPT.length ? 0 : s + 1)), delay);
    return () => clearTimeout(t);
  }, [step, reduced]);

  const placed = new Map(SCRIPT.slice(0, step).map(([i, m]) => [i, m]));
  const won = step >= SCRIPT.length;
  const nextMark = SCRIPT[step]?.[1];

  return (
    <div className="relative" aria-hidden="true">
      <div className="card relative rotate-[-2deg] p-4 shadow-lift sm:p-5">
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {Array.from({ length: 9 }, (_, i) => {
            const mark = placed.get(i);
            const isWin = won && WIN.includes(i);
            return (
              <div
                key={i}
                className={clsx(
                  'flex aspect-square w-[22vw] max-w-[104px] items-center justify-center rounded-2xl border border-line bg-canvas/60 transition-colors duration-300 sm:w-24',
                  isWin && 'animate-win-pulse border-transparent bg-xmark-light',
                )}
              >
                {mark && (
                  <Mark
                    key={`${i}-${step > 0}`}
                    mark={mark}
                    animate
                    className="h-[60%] w-[60%] animate-pop"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* Floating presence bubbles */}
      <div className="absolute -left-4 -top-5 flex animate-float items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold shadow-card sm:-left-8">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Hana {won ? 'wins! 🎉' : nextMark === 'X' ? 'is thinking…' : 'played'}
      </div>
      <div
        className="absolute -bottom-5 -right-3 flex animate-float items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold shadow-card sm:-right-6"
        style={{ animationDelay: '1.2s' }}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Gus {won ? 'wants a rematch' : nextMark === 'O' ? 'is thinking…' : 'is watching'}
      </div>
    </div>
  );
}
