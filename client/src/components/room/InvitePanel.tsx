import { Check, Copy, Link2, Share2, Shuffle, X } from 'lucide-react';
import { GAME_CATALOG, type GameType } from '@arena/shared';
import { inviteUrl } from '../../lib/config';
import { useCopy } from '../../hooks/useCopy';
import { formatDuration, useCountdown } from '../../hooks/useCountdown';
import { Button } from '../common/Button';
import { GamePreview } from '../game/GamePreview';

interface InvitePanelProps {
  roomCode: string;
  gameType: GameType;
  expiresAt: string;
  onCancel: () => void;
  cancelling?: boolean;
  /** Opens the game picker; the host can change the game freely while waiting. */
  onChangeGame: () => void;
}

/** Waiting room: big shareable code + invite link while the host waits for a friend. */
export function InvitePanel({
  roomCode,
  gameType,
  expiresAt,
  onCancel,
  cancelling,
  onChangeGame,
}: InvitePanelProps) {
  const { copied, copy } = useCopy();
  const link = inviteUrl(roomCode);
  const remaining = useCountdown(expiresAt);
  const game = GAME_CATALOG[gameType];
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="card animate-fade-up overflow-hidden" aria-labelledby="invite-title">
        <div className="border-b border-line bg-gradient-to-br from-brand-50 via-white to-white px-5 py-6 sm:px-8 sm:py-8">
          <p className="eyebrow">Room ready</p>
          <h1 id="invite-title" className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Invite your partner
          </h1>
          <p className="mt-2 text-sm text-ink-soft sm:text-base">
            Share the code or link. You start with <strong>{game.name}</strong>, and once you’re
            together you can switch between all 12 games as often as you like.
          </p>
        </div>

        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <p className="text-sm font-semibold text-ink-soft" id="room-code-label">
            Room code
          </p>
          <div
            className="mt-3 flex flex-wrap items-center gap-2"
            aria-labelledby="room-code-label"
            role="group"
          >
            <span className="sr-only" data-testid="room-code">
              {roomCode}
            </span>
            {roomCode.split('').map((ch, i) => (
              <span key={i} className="contents">
                {i === 3 && (
                  <span className="mx-0.5 text-2xl font-bold text-ink-muted" aria-hidden="true">
                    –
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className="flex h-12 w-10 items-center justify-center rounded-xl border border-line bg-canvas font-mono text-2xl font-bold text-ink shadow-sm sm:h-14 sm:w-12 sm:text-3xl"
                >
                  {ch}
                </span>
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
            <Button onClick={() => copy('code', roomCode)} variant="primary" className="sm:flex-1">
              {copied === 'code' ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied === 'code' ? 'Code copied!' : 'Copy code'}
            </Button>
            <Button onClick={() => copy('link', link)} variant="secondary" className="sm:flex-1">
              {copied === 'link' ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Link2 className="h-4 w-4" aria-hidden="true" />
              )}
              {copied === 'link' ? 'Link copied!' : 'Copy invite link'}
            </Button>
            {canShare && (
              <Button
                variant="secondary"
                onClick={() =>
                  void navigator
                    .share({ title: `Play ${game.name} with me`, url: link })
                    .catch(() => {})
                }
                aria-label="Share invite"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>

          <label className="mt-4 block">
            <span className="sr-only">Invite link</span>
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="input truncate bg-canvas font-mono text-sm text-ink-soft"
            />
          </label>

          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-canvas px-4 py-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3" role="status">
              <span className="flex gap-1" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2.5 w-2.5 animate-blink rounded-full bg-brand-500"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </span>
              <span className="text-sm font-semibold text-ink">
                Waiting for your friend to join…
              </span>
            </div>
            <span className="text-xs font-medium text-ink-muted">
              Room expires in {formatDuration(remaining)}
            </span>
          </div>
        </div>
      </section>

      <aside className="flex flex-col gap-5">
        <div className="card p-5">
          <div className="rounded-2xl bg-canvas p-4">
            <GamePreview gameType={gameType} className="h-28" />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <h2 className="font-bold">
              {game.emoji} {game.name}
            </h2>
            <Button variant="soft" size="sm" onClick={onChangeGame}>
              <Shuffle className="h-4 w-4" aria-hidden="true" /> Change game
            </Button>
          </div>
          <ul className="mt-2 space-y-2 text-sm text-ink-soft">
            {game.rules.map((rule) => (
              <li key={rule} className="flex gap-2">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400"
                  aria-hidden="true"
                />
                {rule}
              </li>
            ))}
          </ul>
        </div>
        <Button variant="danger" onClick={onCancel} loading={cancelling}>
          <X className="h-4 w-4" aria-hidden="true" /> Close room
        </Button>
      </aside>
    </div>
  );
}
