import clsx from 'clsx';
import { pitOf, storeOf, type MancalaExt, type Mark } from '@arena/shared';
import type { BoardProps } from './types';

function Seeds({ count }: { count: number }) {
  const shown = Math.min(count, 12);
  return (
    <span
      className="flex max-w-[80%] flex-wrap items-center justify-center gap-[3px]"
      aria-hidden="true"
    >
      {Array.from({ length: shown }, (_, i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2"
          style={{ background: ['#7C5CFF', '#F2456A', '#1597E5', '#2BD9A0', '#FFC542'][i % 5] }}
        />
      ))}
    </span>
  );
}

/** Mancala: your pits are always on the bottom row, your store on the right. */
export function MancalaBoard({ game, myMark, interactive, onMove, names }: BoardProps) {
  const ext = game.ext as MancalaExt;
  const me: Mark = myMark ?? 'X';
  const opp: Mark = me === 'X' ? 'O' : 'X';
  const captured = new Set(ext.captured);
  const last = game.lastMove?.cell;

  const pit = (abs: number, owner: Mark, local: number) => {
    const count = ext.pits[abs]!;
    const mine = owner === me;
    const canPlay = interactive && mine && count > 0;
    return (
      <button
        key={abs}
        type="button"
        data-pit={mine ? local : undefined}
        aria-label={`${mine ? 'Your' : `${names[owner]}'s`} pit ${local + 1}: ${count} seeds`}
        aria-disabled={!canPlay}
        disabled={!mine}
        onClick={() => canPlay && onMove(local)}
        className={clsx(
          'relative flex aspect-square flex-col items-center justify-center gap-1 rounded-full bg-amber-900/20 shadow-[inset_0_4px_8px_rgba(0,0,0,0.25)] transition',
          canPlay && 'cursor-pointer hover:bg-amber-900/30 hover:ring-4 hover:ring-white/60',
          !canPlay && 'cursor-default',
          last === abs && 'ring-2 ring-white',
          captured.has(abs) && 'animate-shake',
        )}
      >
        <span className="text-sm font-extrabold text-amber-950 sm:text-base">{count}</span>
        <Seeds count={count} />
      </button>
    );
  };

  const store = (mark: Mark) => (
    <div
      className={clsx(
        'flex w-12 flex-col items-center justify-center gap-1 rounded-full bg-amber-900/25 py-4 shadow-[inset_0_4px_10px_rgba(0,0,0,0.3)] sm:w-16',
        last === storeOf(mark) && 'ring-2 ring-white',
      )}
      aria-label={`${mark === me ? 'Your' : `${names[mark]}'s`} store: ${ext.pits[storeOf(mark)]} seeds`}
      role="img"
    >
      <span className="text-xl font-black text-amber-950 sm:text-2xl">
        {ext.pits[storeOf(mark)]}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wide text-amber-950/70">
        {mark === me ? 'You' : 'Them'}
      </span>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[min(94vw,620px)] select-none">
      <p className="mb-2 text-center text-xs font-semibold text-ink-muted">{names[opp]}’s side</p>
      <div className="flex items-stretch gap-2 rounded-[32px] bg-gradient-to-b from-amber-300 to-amber-400 p-3 shadow-lift sm:gap-3 sm:p-4">
        {store(opp)}
        <div className="grid flex-1 grid-cols-6 gap-2 sm:gap-3">
          {[5, 4, 3, 2, 1, 0].map((k) => pit(pitOf(opp, k), opp, k))}
          {[0, 1, 2, 3, 4, 5].map((k) => pit(pitOf(me, k), me, k))}
        </div>
        {store(me)}
      </div>
      <p className="mt-2 text-center text-xs font-semibold text-ink-muted">
        Your side · seeds travel left → right into your store
      </p>
    </div>
  );
}
