import clsx from 'clsx';
import type { CSSProperties } from 'react';
import type { BoardProps } from './types';

const HEX = 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)';

/**
 * Hex on a 9x9 rhombus. Each row shifts half a cell to the right. X joins the
 * top and bottom edges (coral), O joins the left and right edges (ocean).
 */
export function HexBoard({ game, interactive, onMove }: BoardProps) {
  const n = game.cols;
  const winning = new Set(game.winningLine ?? []);
  // Total width in cell units: n cells plus (n - 1) half-cell offsets.
  const units = n + (n - 1) / 2;
  const cellPct = 100 / units;

  return (
    <div className="mx-auto w-full max-w-[min(96vw,640px)] select-none">
      <div className="mb-2 flex justify-between text-[11px] font-bold">
        <span className="rounded-full bg-xmark-light px-2 py-0.5 text-xmark-dark">
          X: top ↕ bottom
        </span>
        <span className="rounded-full bg-omark-light px-2 py-0.5 text-omark-dark">
          O: left ↔ right
        </span>
      </div>
      <div className="card p-3 sm:p-5" role="grid" aria-label={`Hex board, ${n} by ${n}`}>
        <div>
          {Array.from({ length: n }, (_, r) => (
            <div
              key={r}
              className="flex"
              role="row"
              style={{
                marginLeft: `${r * (cellPct / 2)}%`,
                marginTop: r === 0 ? 0 : `-${cellPct * 0.2887}%`,
              }}
            >
              {Array.from({ length: n }, (_, c) => {
                const i = r * n + c;
                const cell = game.board[i];
                const canPlay = interactive && cell === null;
                const isLast = game.lastMove?.cell === i;
                const edgeO = c === 0 || c === n - 1;
                const edgeX = r === 0 || r === n - 1;
                return (
                  <button
                    key={c}
                    type="button"
                    role="gridcell"
                    data-cell={i}
                    aria-label={`Row ${r + 1}, column ${c + 1}: ${cell ?? 'empty'}${winning.has(i) ? ', winning chain' : ''}`}
                    aria-disabled={!canPlay}
                    onClick={() => canPlay && onMove(i)}
                    style={{ width: `${cellPct}%`, clipPath: HEX } as CSSProperties}
                    className={clsx(
                      'relative aspect-[0.866] shrink-0 p-[1.5px] transition focus-visible:ring-0',
                      'bg-line focus-visible:bg-brand-500',
                    )}
                  >
                    <span
                      style={{ clipPath: HEX }}
                      className={clsx(
                        'flex h-full w-full items-center justify-center transition',
                        cell === 'X' && 'bg-xmark',
                        cell === 'O' && 'bg-omark',
                        !cell &&
                          (edgeX && edgeO
                            ? 'bg-brand-100'
                            : edgeX
                              ? 'bg-xmark-light'
                              : edgeO
                                ? 'bg-omark-light'
                                : 'bg-white'),
                        canPlay && 'hover:bg-brand-100',
                        winning.has(i) && 'animate-win-pulse brightness-110',
                        isLast && cell && 'animate-pop',
                      )}
                    >
                      {isLast && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
