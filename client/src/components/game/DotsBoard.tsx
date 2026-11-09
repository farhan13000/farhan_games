import clsx from 'clsx';
import { Fragment } from 'react';
import { hLine, vLine, type Mark as MarkType } from '@arena/shared';
import { Mark } from './Mark';
import type { BoardProps } from './types';

const DOT = '14px';

function lineColor(owner: MarkType | null) {
  if (owner === 'X') return 'bg-xmark';
  if (owner === 'O') return 'bg-omark';
  return 'bg-ink/[0.08]';
}

/** Dots & Boxes: claim lines between dots; boxes show the owner's mark. */
export function DotsBoard({ game, myMark, interactive, onMove }: BoardProps) {
  const { rows, cols, board, boxes, lastMove } = game;
  const completed = new Set(lastMove?.completedBoxes ?? []);
  const track = `repeat(${cols}, ${DOT} minmax(0, 1fr)) ${DOT}`;
  const trackRows = `repeat(${rows}, ${DOT} minmax(0, 1fr)) ${DOT}`;

  const lineButton = (index: number, orientation: 'h' | 'v', label: string) => {
    const owner = board[index] ?? null;
    const canPlay = interactive && owner === null;
    const isLast = lastMove?.cell === index;
    return (
      <button
        key={`l${index}`}
        type="button"
        data-line={index}
        aria-label={`${label}${owner ? `, drawn by ${owner}` : ', open'}${isLast ? ', last move' : ''}`}
        aria-disabled={!canPlay}
        onClick={() => canPlay && onMove(index)}
        className={clsx(
          'group relative flex items-center justify-center rounded-full',
          // Generous invisible hit area for touch.
          orientation === 'h'
            ? "before:absolute before:-inset-y-3 before:inset-x-0 before:content-['']"
            : "before:absolute before:-inset-x-3 before:inset-y-0 before:content-['']",
          canPlay ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        <span
          className={clsx(
            'block rounded-full transition-all duration-200',
            orientation === 'h' ? 'h-[6px] w-full' : 'h-full w-[6px]',
            isLast && (orientation === 'h' ? '!h-[8px]' : '!w-[8px]'),
            lineColor(owner),
            owner && 'animate-pop',
            canPlay &&
              myMark &&
              (myMark === 'X'
                ? 'group-hover:bg-xmark/50 group-focus-visible:bg-xmark/50'
                : 'group-hover:bg-omark/50 group-focus-visible:bg-omark/50'),
          )}
        />
      </button>
    );
  };

  const cells = [];
  for (let r2 = 0; r2 <= rows * 2; r2++) {
    for (let c2 = 0; c2 <= cols * 2; c2++) {
      const evenR = r2 % 2 === 0;
      const evenC = c2 % 2 === 0;
      if (evenR && evenC) {
        cells.push(
          <span
            key={`d${r2}-${c2}`}
            className="z-10 m-auto h-3.5 w-3.5 rounded-full bg-ink shadow-[0_0_0_3px_white]"
            aria-hidden="true"
          />,
        );
      } else if (evenR) {
        const r = r2 / 2;
        const c = (c2 - 1) / 2;
        cells.push(
          lineButton(
            hLine(r, c, cols),
            'h',
            `Horizontal line, row ${r + 1}, between dots ${c + 1} and ${c + 2}`,
          ),
        );
      } else if (evenC) {
        const r = (r2 - 1) / 2;
        const c = c2 / 2;
        cells.push(
          lineButton(
            vLine(r, c, rows, cols),
            'v',
            `Vertical line, column ${c + 1}, between dots ${r + 1} and ${r + 2}`,
          ),
        );
      } else {
        const box = ((r2 - 1) / 2) * cols + (c2 - 1) / 2;
        const owner = boxes[box] ?? null;
        cells.push(
          <div
            key={`b${box}`}
            className={clsx(
              'm-1 flex items-center justify-center rounded-xl transition-colors duration-300',
              owner === 'X' && 'bg-xmark-light',
              owner === 'O' && 'bg-omark-light',
            )}
            aria-hidden={!owner}
          >
            {owner && (
              <Fragment>
                <Mark
                  mark={owner}
                  className={clsx('h-[58%] w-[58%]', completed.has(box) && 'animate-pop')}
                  animate={completed.has(box)}
                />
                <span className="sr-only">Box owned by {owner}</span>
              </Fragment>
            )}
          </div>,
        );
      }
    }
  }

  return (
    <div className="card mx-auto w-full max-w-[min(92vw,480px)] p-4 sm:p-6">
      <div
        role="group"
        aria-label={`Dots and Boxes board, ${rows} by ${cols} boxes`}
        className="grid aspect-square w-full select-none"
        style={{ gridTemplateColumns: track, gridTemplateRows: trackRows }}
      >
        {cells}
      </div>
    </div>
  );
}
