import clsx from 'clsx';
import { reversiLegalMoves, type ReversiExt } from '@arena/shared';
import type { BoardProps } from './types';
import { useRovingFocus } from './useRovingFocus';

export function ReversiBoard({ game, myMark, interactive, onMove }: BoardProps) {
  const n = game.cols;
  const ext = game.ext as ReversiExt;
  const legal = new Set(interactive && myMark ? reversiLegalMoves(game.board, n, myMark) : []);
  const flipped = new Set(ext.flipped);
  const { itemProps } = useRovingFocus(n, n, [...legal][0] ?? 27);

  return (
    <div className="mx-auto w-full max-w-[min(94vw,520px)] select-none rounded-[28px] bg-gradient-to-b from-emerald-700 to-emerald-800 p-2.5 shadow-lift sm:p-3.5">
      <div
        role="grid"
        aria-label="Reversi board, 8 by 8"
        className="grid grid-cols-8 gap-1 sm:gap-1.5"
      >
        {game.board.map((cell, i) => {
          const isLegal = legal.has(i);
          const isLast = game.lastMove?.cell === i;
          const r = Math.floor(i / n);
          const c = i % n;
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              data-cell={i}
              aria-label={`Row ${r + 1}, column ${c + 1}: ${cell ?? (isLegal ? 'legal move' : 'empty')}${isLast ? ', last move' : ''}`}
              aria-disabled={!isLegal}
              onClick={() => isLegal && onMove(i)}
              {...itemProps(i)}
              className={clsx(
                'relative flex aspect-square items-center justify-center rounded-md bg-emerald-600/90 transition',
                isLegal ? 'cursor-pointer hover:bg-emerald-500' : 'cursor-default',
                isLast && 'ring-2 ring-inset ring-amber-300',
              )}
            >
              {cell ? (
                <span
                  className={clsx(
                    'h-[80%] w-[80%] rounded-full shadow-[inset_0_-3px_0_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.25)]',
                    cell === 'X' ? 'bg-xmark' : 'bg-omark',
                    (flipped.has(i) || isLast) && 'animate-pop',
                  )}
                >
                  <span className="sr-only">{cell}</span>
                </span>
              ) : (
                isLegal && (
                  <span className="h-[26%] w-[26%] rounded-full bg-white/50" aria-hidden="true" />
                )
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
