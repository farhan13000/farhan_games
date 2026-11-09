import clsx from 'clsx';
import { Mark } from './Mark';
import type { BoardProps } from './types';
import { useRovingFocus } from './useRovingFocus';

/** Free-placement grid used by Tic-Tac-Toe (3x3) and Five in a Row (13x13). */
export function GridBoard({ game, myMark, interactive, onMove }: BoardProps) {
  const { rows, cols, board, winningLine, lastMove } = game;
  const large = cols > 5;
  const firstEmpty = Math.max(
    0,
    board.findIndex((c) => c === null),
  );
  const center = Math.floor((rows * cols) / 2);
  const { itemProps } = useRovingFocus(rows, cols, large ? center : firstEmpty);
  const winSet = new Set(winningLine ?? []);

  return (
    <div
      role="grid"
      aria-label={`${rows} by ${cols} game board`}
      aria-rowcount={rows}
      aria-colcount={cols}
      className={clsx(
        'mx-auto grid w-full select-none',
        large
          ? 'max-w-[min(94vw,620px)] gap-[2px] rounded-2xl border border-line bg-line p-[2px] shadow-card'
          : 'max-w-[min(88vw,440px)] gap-2.5 sm:gap-3.5',
      )}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {board.map((cell, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const isWin = winSet.has(i);
        const isLast = lastMove?.cell === i;
        const canPlay = interactive && cell === null;
        const label = `Row ${r + 1}, column ${c + 1}: ${cell ?? 'empty'}${isWin ? ', part of winning line' : ''}${
          isLast ? ', last move' : ''
        }`;
        return (
          <button
            key={i}
            type="button"
            role="gridcell"
            aria-label={label}
            aria-disabled={!canPlay}
            data-cell={i}
            onClick={() => canPlay && onMove(i)}
            {...itemProps(i)}
            className={clsx(
              'group relative flex aspect-square items-center justify-center transition duration-150',
              large
                ? 'rounded-[4px] bg-white'
                : 'rounded-3xl border border-line bg-white shadow-sm',
              canPlay &&
                (large
                  ? 'cursor-pointer hover:bg-brand-50'
                  : 'cursor-pointer hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card'),
              !canPlay && 'cursor-default',
              isWin && (cell === 'X' ? '!bg-xmark-light' : '!bg-omark-light'),
              isWin && !large && 'animate-win-pulse !border-transparent',
              isLast &&
                !isWin &&
                (large ? 'ring-2 ring-inset ring-brand-300' : 'ring-2 ring-brand-200'),
              'focus-visible:z-10',
            )}
          >
            {cell ? (
              <Mark
                mark={cell}
                animate={isLast}
                className={clsx(large ? 'h-[82%] w-[82%]' : 'h-[62%] w-[62%] animate-pop')}
                strokeWidth={large ? 15 : 13}
              />
            ) : (
              canPlay &&
              myMark && (
                <Mark
                  mark={myMark}
                  className={clsx(
                    'opacity-0 transition group-hover:opacity-25 group-focus-visible:opacity-25',
                    large ? 'h-[82%] w-[82%]' : 'h-[55%] w-[55%]',
                  )}
                />
              )
            )}
            {isLast && !large && (
              <span
                className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-brand-400"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
