import clsx from 'clsx';
import { Handshake, LogOut, RotateCcw, Shuffle, Trophy } from 'lucide-react';
import { useState } from 'react';
import { GAME_CATALOG, type GameType, type RoomSnapshot } from '@arena/shared';
import { syncVerdict, type RoomView } from '../../features/rooms/roomModel';
import { Button } from '../common/Button';
import { Spinner } from '../common/Spinner';
import { GameGrid } from './GameMenu';

interface ProposalProps {
  view: RoomView;
  busy: boolean;
  onRespond: (accept: boolean) => void;
}

/** Shown during a round when the partner proposes switching (or restarting). */
export function ProposalBanner({ view, busy, onRespond }: ProposalProps) {
  const p = view.proposal;
  if (!p) return null;
  const game = GAME_CATALOG[p.gameType];
  const name = view.opponent?.displayName ?? 'Your partner';
  return (
    <div
      role="status"
      className="card flex animate-fade-up flex-col items-center gap-3 border-brand-200 bg-brand-50/70 p-4 text-center sm:flex-row sm:text-left"
    >
      <span className="text-3xl" aria-hidden="true">
        {game.emoji}
      </span>
      <p className="flex-1 text-sm font-semibold">
        {p.opponentVoted && !p.iVoted
          ? `${name} wants to ${p.isRematch ? 'restart' : `switch to ${game.name}`}. The current round won't count.`
          : `Waiting for ${name} to agree to ${p.isRematch ? 'a restart' : game.name}…`}
      </p>
      {p.opponentVoted && !p.iVoted ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onRespond(true)} loading={busy}>
            Let's play
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onRespond(false)} disabled={busy}>
            Not now
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => onRespond(false)} disabled={busy}>
          Cancel
        </Button>
      )}
    </div>
  );
}

interface NextGamePanelProps {
  snapshot: RoomSnapshot;
  view: RoomView;
  busy: boolean;
  onPropose: (gameType?: GameType) => void;
  onRespond: (accept: boolean) => void;
  onLeave: () => void;
}

const HEADLINES = {
  win: { emoji: '🏆', tone: 'from-emerald-50 to-white', text: 'Nicely played!' },
  loss: { emoji: '💪', tone: 'from-brand-50 to-white', text: 'Shake it off and go again.' },
  draw: { emoji: '🤝', tone: 'from-amber-50 to-white', text: 'Perfectly matched.' },
  coop: { emoji: '🔮', tone: 'from-pink-50 to-white', text: 'Your shared sync score' },
} as const;

/** End-of-round result plus "what next": rematch or pick any other game. */
export function NextGamePanel({
  snapshot,
  view,
  busy,
  onPropose,
  onRespond,
  onLeave,
}: NextGamePanelProps) {
  const [picking, setPicking] = useState(false);
  const kind = view.result ?? 'draw';
  const headline = HEADLINES[kind];
  const name = view.opponent?.displayName ?? 'Your partner';
  const partnerOnline = view.opponent?.connected ?? false;
  const p = view.proposal;
  const syncScore = snapshot.game.scores.X;

  const title =
    kind === 'coop'
      ? `${syncScore}/10 in sync`
      : kind === 'win'
        ? 'You win!'
        : kind === 'loss'
          ? `${view.winner?.displayName ?? name} wins`
          : "It's a draw";

  return (
    <section
      aria-labelledby="round-result-title"
      className={clsx(
        'card animate-fade-up overflow-hidden bg-gradient-to-b p-5 sm:p-6',
        headline.tone,
      )}
    >
      <div className="text-center">
        <div className="text-4xl" aria-hidden="true">
          {headline.emoji}
        </div>
        <h2 id="round-result-title" className="mt-2 text-2xl font-extrabold tracking-tight">
          {title}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {kind === 'coop' ? syncVerdict(syncScore, 10) : headline.text}
        </p>

        <div className="mx-auto mt-4 flex max-w-xs items-center justify-center gap-4 rounded-2xl bg-white/80 px-4 py-3 text-sm shadow-sm">
          <span className="font-semibold">
            <Trophy className="mr-1 inline h-4 w-4 text-amber-500" aria-hidden="true" />
            You {view.me?.wins ?? 0}
          </span>
          <span className="text-ink-muted">Draws {snapshot.draws}</span>
          <span className="font-semibold">
            {name.split(' ')[0]} {view.opponent?.wins ?? 0}
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-3" aria-live="polite">
        {p?.opponentVoted && !p.iVoted ? (
          <>
            <p className="text-center text-sm font-semibold text-brand-700">
              {name} wants to play{' '}
              {p.isRematch
                ? 'again'
                : `${GAME_CATALOG[p.gameType].emoji} ${GAME_CATALOG[p.gameType].name}`}
              !
            </p>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button onClick={() => onRespond(true)} loading={busy}>
                <Handshake className="h-4 w-4" aria-hidden="true" /> Let's play
              </Button>
              <Button variant="secondary" onClick={() => setPicking((v) => !v)} disabled={busy}>
                <Shuffle className="h-4 w-4" aria-hidden="true" /> Suggest another
              </Button>
              <Button variant="ghost" onClick={() => onRespond(false)} disabled={busy}>
                Decline
              </Button>
            </div>
          </>
        ) : p?.iVoted ? (
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft">
            <Spinner className="h-4 w-4 text-brand-600" /> Waiting for {name} to accept{' '}
            {p.isRematch ? 'the rematch' : GAME_CATALOG[p.gameType].name}…
          </p>
        ) : (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button size="lg" onClick={() => onPropose()} loading={busy} disabled={!partnerOnline}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Rematch
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setPicking((v) => !v)}
              disabled={!partnerOnline}
            >
              <Shuffle className="h-4 w-4" aria-hidden="true" /> Play something else
            </Button>
          </div>
        )}
        {!partnerOnline && (
          <p className="text-xs text-amber-700">
            {name} is offline. You can pick the next game when they're back.
          </p>
        )}

        {picking && (
          <div className="mt-2 w-full rounded-3xl border border-line bg-white p-4 text-left">
            <GameGrid
              current={snapshot.gameType}
              disabled={busy || !partnerOnline}
              onPick={(g) => {
                setPicking(false);
                onPropose(g);
              }}
            />
          </div>
        )}

        <p className="text-center text-xs text-ink-muted">
          Marks swap every round, so the other player starts next time.
        </p>
        <Button variant="ghost" size="sm" onClick={onLeave}>
          <LogOut className="h-4 w-4" aria-hidden="true" /> Leave room
        </Button>
      </div>
    </section>
  );
}
