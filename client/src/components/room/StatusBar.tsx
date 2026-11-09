import clsx from 'clsx';
import type { RoomSnapshot } from '@arena/shared';
import { statusHint, statusMessage, type RoomView } from '../../features/rooms/roomModel';
import { MarkBadge } from '../game/Mark';

/** Turn / result indicator with a polite live region for screen readers. */
export function StatusBar({ snapshot, view }: { snapshot: RoomSnapshot; view: RoomView }) {
  const message = statusMessage(snapshot, view);
  const hint = statusHint(snapshot, view);
  const { game } = snapshot;
  const roundOver = game.status === 'COMPLETED';
  const showTurnMark = !roundOver && view.isRoundActive && game.turnMode === 'alternate';
  const waitingOnOpponent = !roundOver && view.isRoundActive && !view.isMyTurn;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={clsx(
          'inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm font-bold shadow-sm transition-all duration-300 sm:text-base',
          roundOver &&
            (view.result === 'win' || view.result === 'coop') &&
            'border-emerald-200 bg-emerald-50 text-emerald-800',
          roundOver && view.result === 'loss' && 'border-line bg-white text-ink',
          roundOver && view.result === 'draw' && 'border-amber-200 bg-amber-50 text-amber-800',
          !roundOver && view.isMyTurn && 'border-brand-200 bg-brand-50 text-brand-800',
          waitingOnOpponent && 'border-line bg-white text-ink-soft',
        )}
      >
        {showTurnMark && <MarkBadge mark={game.currentTurn} className="h-6 w-6 rounded-lg" />}
        <span data-testid="status-message">{message}</span>
        {waitingOnOpponent && (
          <span className="flex gap-0.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-blink rounded-full bg-current"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </span>
        )}
      </div>
      <p className="text-center text-xs font-medium text-ink-muted">
        Round {snapshot.roundNumber} · Move <span data-testid="move-count">{game.moveCount}</span>
        {hint && ` · ${hint}`}
        {view.opponent &&
          !view.opponent.connected &&
          !view.isEnded &&
          ` · ${view.opponent.displayName} is reconnecting`}
      </p>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {message}
      </p>
    </div>
  );
}
