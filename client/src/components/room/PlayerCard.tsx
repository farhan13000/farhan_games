import clsx from 'clsx';
import { Crown, Lock, UserRound, Wifi, WifiOff } from 'lucide-react';
import type { Mark as MarkType, PlayerSnapshot } from '@arena/shared';
import type { Activity } from '../../features/rooms/roomModel';
import { MarkBadge } from '../game/Mark';

interface PlayerCardProps {
  player: PlayerSnapshot | null;
  mark: MarkType;
  isMe: boolean;
  activity: Activity;
  /** In-round score and its label (e.g. 12 discs); otherwise series wins are shown. */
  roundScore?: { value: number; label: string };
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function PlayerCard({ player, mark, isMe, activity, roundScore }: PlayerCardProps) {
  if (!player) {
    return (
      <div className="flex items-center gap-3 rounded-3xl border-2 border-dashed border-line bg-white/60 p-3 sm:p-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink/5 text-ink-muted">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-muted">Waiting for partner…</p>
          <p className="text-xs text-ink-muted">Will play {mark}</p>
        </div>
      </div>
    );
  }

  const isTurn = activity === 'turn';
  const statusText = !player.connected
    ? 'Reconnecting…'
    : activity === 'locked'
      ? 'Locked in'
      : isTurn
        ? 'Thinking…'
        : 'Online';

  return (
    <section
      aria-label={`Player ${mark}: ${player.displayName}${isMe ? ' (you)' : ''}`}
      className={clsx(
        'relative flex items-center gap-3 rounded-3xl border bg-white p-3 transition-all duration-300 sm:p-4',
        isTurn
          ? mark === 'X'
            ? 'border-xmark/40 shadow-[0_0_0_4px_rgba(242,69,106,0.12)]'
            : 'border-omark/40 shadow-[0_0_0_4px_rgba(21,151,229,0.12)]'
          : 'border-line shadow-card',
      )}
    >
      <div
        className={clsx(
          'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold text-white',
          mark === 'X'
            ? 'bg-gradient-to-br from-xmark to-xmark-dark'
            : 'bg-gradient-to-br from-omark to-omark-dark',
        )}
        aria-hidden="true"
      >
        {initials(player.displayName)}
        <span
          className={clsx(
            'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white',
            player.connected ? 'bg-emerald-500' : 'animate-pulse bg-amber-400',
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-bold text-ink">{player.displayName}</p>
          {player.isHost && (
            <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Host" />
          )}
          {isMe && (
            <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-700">
              You
            </span>
          )}
        </div>
        <p
          className={clsx(
            'flex items-center gap-1 text-xs font-medium',
            !player.connected
              ? 'text-amber-700'
              : activity === 'locked'
                ? 'text-brand-700'
                : 'text-emerald-700',
          )}
        >
          {!player.connected ? (
            <WifiOff className="h-3 w-3" aria-hidden="true" />
          ) : activity === 'locked' ? (
            <Lock className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Wifi className="h-3 w-3" aria-hidden="true" />
          )}
          {statusText}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <div className="text-right">
          <p className="text-lg font-extrabold leading-none tabular-nums text-ink">
            {roundScore?.value ?? player.wins}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            {roundScore ? roundScore.label : 'wins'}
          </p>
          {roundScore && <p className="text-[10px] text-ink-muted">{player.wins} wins</p>}
        </div>
        <MarkBadge mark={mark} className="h-10 w-10" />
      </div>
      {isTurn && (
        <span className="sr-only">It is {isMe ? 'your' : `${player.displayName}'s`} turn.</span>
      )}
    </section>
  );
}
