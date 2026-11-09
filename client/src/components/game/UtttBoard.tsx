import clsx from 'clsx';
import { validateMove, type UtttExt } from '@arena/shared';
import { Mark } from './Mark';
import type { BoardProps } from './types';

/** Ultimate Tic-Tac-Toe: a 3x3 grid of small boards; the forced board glows. */
export function UtttBoard({ game, myMark, interactive, onMove }: BoardProps) {
  const ext = game.ext as UtttExt;
  const macroWin = new Set(ext.macroLine ?? []);

  return (
    <div
      role="group"
      aria-label="Ultimate Tic-Tac-Toe board"
      className="mx-auto grid w-full max-w-[min(94vw,540px)] select-none grid-cols-3 gap-2 sm:gap-3"
    >
      {Array.from({ length: 9 }, (_, b) => {
        const result = ext.macro[b];
        const active =
          game.status === 'IN_PROGRESS' &&
          result === null &&
          (ext.forced === null || ext.forced === b);
        return (
          <div
            key={b}
            role="grid"
            aria-label={`Small board ${b + 1}${result === 'D' ? ', drawn' : result ? `, won by ${result}` : active ? ', playable' : ''}`}
            className={clsx(
              'relative grid grid-cols-3 gap-1 rounded-2xl border p-1.5 transition-all duration-300',
              active && interactive
                ? 'border-brand-300 bg-brand-50 shadow-glow'
                : 'border-line bg-white',
              macroWin.has(b) && 'animate-win-pulse',
            )}
          >
            {Array.from({ length: 9 }, (_, c) => {
              const idx = b * 9 + c;
              const cell = game.board[idx];
              const canPlay = interactive && !!myMark && validateMove(game, idx, myMark).ok;
              const isLast = game.lastMove?.cell === idx;
              return (
                <button
                  key={c}
                  type="button"
                  role="gridcell"
                  data-cell={idx}
                  aria-label={`Board ${b + 1}, cell ${c + 1}: ${cell ?? 'empty'}${isLast ? ', last move' : ''}`}
                  aria-disabled={!canPlay}
                  onClick={() => canPlay && onMove(idx)}
                  className={clsx(
                    'flex aspect-square items-center justify-center rounded-md transition',
                    canPlay
                      ? 'cursor-pointer bg-white hover:bg-brand-100'
                      : 'cursor-default bg-canvas',
                    isLast && 'ring-2 ring-brand-300',
                  )}
                >
                  {cell && (
                    <Mark
                      mark={cell}
                      animate={isLast}
                      className="h-[72%] w-[72%]"
                      strokeWidth={16}
                    />
                  )}
                </button>
              );
            })}
            {result && (
              <div
                className={clsx(
                  'pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl backdrop-blur-[1px]',
                  result === 'X'
                    ? 'bg-xmark-light/80'
                    : result === 'O'
                      ? 'bg-omark-light/80'
                      : 'bg-white/75',
                )}
                aria-hidden="true"
              >
                {result === 'D' ? (
                  <span className="text-sm font-bold text-ink-muted">Draw</span>
                ) : (
                  <Mark mark={result} className="h-3/4 w-3/4 animate-pop" strokeWidth={12} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
