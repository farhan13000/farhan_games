import clsx from 'clsx';
import { useState, type CSSProperties } from 'react';
import { getDropCell, type Mark as MarkType } from '@arena/shared';
import type { BoardProps } from './types';
import { useRovingFocus } from './useRovingFocus';

function Disc({ mark, ghost }: { mark: MarkType; ghost?: boolean }) {
  return (
    <span
      className={clsx(
        'absolute inset-[9%] flex items-center justify-center rounded-full shadow-[inset_0_-4px_0_rgba(0,0,0,0.15)]',
        mark === 'X' ? 'bg-xmark' : 'bg-omark',
        ghost && 'opacity-40',
      )}
    >
      {/* White glyph so discs are distinguishable without color. */}
      <svg viewBox="0 0 100 100" className="h-[46%] w-[46%]" aria-hidden="true">
        {mark === 'X' ? (
          <path
            d="M28 28 L72 72 M72 28 L28 72"
            stroke="white"
            strokeOpacity="0.9"
            strokeWidth="14"
            strokeLinecap="round"
          />
        ) : (
          <circle
            cx="50"
            cy="50"
            r="24"
            stroke="white"
            strokeOpacity="0.9"
            strokeWidth="14"
            fill="none"
          />
        )}
      </svg>
    </span>
  );
}

/** Gravity board for Four in a Row: players choose a column. */
export function DropBoard({ game, myMark, interactive, onMove }: BoardProps) {
  const { rows, cols, board, winningLine, lastMove } = game;
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const { active, itemProps } = useRovingFocus(1, cols, Math.floor(cols / 2));
  const winSet = new Set(winningLine ?? []);
  const previewCol = interactive ? (hoverCol ?? null) : null;

  return (
    <div className="mx-auto w-full max-w-[min(94vw,560px)] select-none">
      {/* Ghost disc row showing where the next disc will drop. */}
      <div
        className="mb-1.5 grid gap-1.5 px-2 sm:gap-2 sm:px-3"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        aria-hidden="true"
      >
        {Array.from({ length: cols }, (_, c) => (
          <div key={c} className="relative aspect-square">
            {myMark && previewCol === c && getDropCell(board, rows, cols, c) !== -1 && (
              <span className="absolute inset-0 animate-pop">
                <Disc mark={myMark} ghost />
              </span>
            )}
          </div>
        ))}
      </div>
      <div
        role="group"
        aria-label="Four in a Row board. Choose a column."
        className="grid gap-1.5 rounded-[28px] bg-gradient-to-b from-brand-600 to-brand-800 p-2 shadow-lift sm:gap-2 sm:p-3"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        onMouseLeave={() => setHoverCol(null)}
      >
        {Array.from({ length: cols }, (_, c) => {
          const target = getDropCell(board, rows, cols, c);
          const free = Array.from({ length: rows }, (_, r) => board[r * cols + c]).filter(
            (x) => x === null,
          ).length;
          const canPlay = interactive && target !== -1;
          return (
            <button
              key={c}
              type="button"
              aria-label={`Column ${c + 1}, ${free} of ${rows} slots free`}
              aria-disabled={!canPlay}
              data-column={c}
              onClick={() => canPlay && onMove(c)}
              onMouseEnter={() => setHoverCol(c)}
              {...itemProps(c)}
              onFocus={() => {
                itemProps(c).onFocus();
                setHoverCol(c);
              }}
              className={clsx(
                'flex flex-col gap-1.5 rounded-2xl p-0.5 transition sm:gap-2',
                canPlay ? 'cursor-pointer hover:bg-white/10' : 'cursor-default',
                active === c && 'focus-visible:bg-white/10',
              )}
            >
              {Array.from({ length: rows }, (_, r) => {
                const idx = r * cols + c;
                const cell = board[idx];
                const isLast = lastMove?.cell === idx;
                return (
                  <span
                    key={r}
                    className="relative block aspect-square rounded-full bg-[#231a63]/50 shadow-[inset_0_3px_6px_rgba(0,0,0,0.35)]"
                  >
                    {cell && (
                      <span
                        className={clsx(
                          'absolute inset-0',
                          isLast && 'animate-drop',
                          winSet.has(idx) && 'animate-win-pulse',
                        )}
                        style={
                          isLast
                            ? ({ '--drop-from': `-${(r + 1) * 115}%` } as CSSProperties)
                            : undefined
                        }
                      >
                        <Disc mark={cell} />
                        {winSet.has(idx) && (
                          <span className="absolute inset-[4%] rounded-full ring-4 ring-white/90" />
                        )}
                      </span>
                    )}
                  </span>
                );
              })}
            </button>
          );
        })}
      </div>
      <span className="sr-only">
        {lastMove
          ? `Last disc: ${lastMove.mark} in column ${lastMove.index + 1}.`
          : 'No discs yet.'}
      </span>
    </div>
  );
}
