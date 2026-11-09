import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Users } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useParams } from 'react-router-dom';
import { z } from 'zod';
import {
  GAME_CATALOG,
  displayNameSchema,
  extractRoomCode,
  formatRoomCode,
  type RoomPreview,
} from '@arena/shared';
import { Button, ButtonLink } from '../../components/common/Button';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageLoader } from '../../components/common/Spinner';
import { ErrorState } from '../../components/common/States';
import { GamePreview } from '../../components/game/GamePreview';
import { toApiError } from '../../lib/errors';
import { socketManager, useConnectionStore } from '../../lib/socket';
import { useAuthStore } from '../../store/authStore';
import { useRoomStore } from '../../store/roomStore';
import { GuestNameField } from '../auth/GuestNameField';
import { useEnsureIdentity } from '../auth/useGuestIdentity';
import { RoomView } from './RoomView';
import { deriveRoomView } from './roomModel';
import { useRoomSession } from './useRoomSession';

export function RoomPage() {
  const { roomCode: raw = '' } = useParams();
  const roomCode = extractRoomCode(raw);
  const status = useAuthStore((s) => s.status);
  const [joinedAsGuest, setJoinedAsGuest] = useState(false);

  if (!roomCode) {
    return (
      <ErrorState
        title="Invalid room link"
        message="This invite link doesn't contain a valid room code."
        action={<ButtonLink to="/join">Enter a code</ButtonLink>}
      />
    );
  }
  if (status === 'loading') return <PageLoader label="Restoring your session…" />;
  if (status === 'anonymous')
    return <InvitedGate roomCode={roomCode} onIdentity={() => setJoinedAsGuest(true)} />;
  return <RoomSession key={roomCode} roomCode={roomCode} autoJoin={joinedAsGuest} />;
}

function RoomSession({ roomCode, autoJoin }: { roomCode: string; autoJoin: boolean }) {
  const location = useLocation();
  const session = useRoomSession(roomCode, {
    autoJoin: autoJoin || Boolean((location.state as { autoJoin?: boolean } | null)?.autoJoin),
  });
  const connection = useConnectionStore((s) => s.status);
  const chatEnabled = useAuthStore((s) => s.features.chat);
  const chat = useRoomStore((s) => s.chat);
  const reactions = useRoomStore((s) => s.reactions);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const { phase, snapshot, playerId, actions } = session;

  if (phase.kind === 'loading' || (phase.kind === 'ready' && !snapshot))
    return <PageLoader label="Joining room…" />;
  if (phase.kind === 'error') {
    return (
      <ErrorState
        title="Can't open this room"
        message={phase.error.message}
        onRetry={
          phase.error.code === 'TIMEOUT' || phase.error.code === 'NETWORK_ERROR'
            ? () => void session.retry()
            : undefined
        }
        action={
          <>
            <ButtonLink to="/join" variant="secondary">
              Join another room
            </ButtonLink>
            <ButtonLink to="/create">Create a room</ButtonLink>
          </>
        }
      />
    );
  }
  if (phase.kind === 'preview') {
    return <JoinCard preview={phase.preview} onJoin={actions.join} joining={session.busy.join} />;
  }

  const s = snapshot!;
  const view = deriveRoomView(s, playerId);
  const requestLeave = () => {
    // Leaving an active round forfeits it, so ask first.
    if (view.isRoundActive && s.game.moveCount > 0) setConfirmLeave(true);
    else void actions.leave();
  };

  return (
    <>
      <RoomView
        snapshot={s}
        myPlayerId={playerId}
        connection={connection}
        pendingMove={session.pendingMove}
        busy={session.busy}
        chatEnabled={chatEnabled}
        chat={chat}
        reactions={reactions}
        onMove={(i) => void actions.makeMove(i)}
        onPropose={(g) => void actions.propose(g)}
        onRespond={(accept) => void actions.respond(accept)}
        onLeave={requestLeave}
        onNewRoom={() => void actions.newRoom(s.gameType)}
        onRetryConnection={() => socketManager.nudge()}
        onSendChat={actions.sendChat}
        onReact={actions.react}
        onReactionDone={(id) => useRoomStore.getState().removeReaction(id)}
      />
      <ConfirmDialog
        open={confirmLeave}
        title="Leave this match?"
        confirmLabel="Leave and forfeit"
        tone="danger"
        loading={session.busy.leave}
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          setConfirmLeave(false);
          void actions.leave();
        }}
      >
        The round is still in progress. If you leave now, your opponent wins by forfeit and the room
        closes.
      </ConfirmDialog>
    </>
  );
}

function JoinCard({
  preview,
  onJoin,
  joining,
}: {
  preview: RoomPreview;
  onJoin: () => void;
  joining: boolean;
}) {
  const game = GAME_CATALOG[preview.gameType];
  return (
    <section
      className="card mx-auto max-w-md animate-fade-up overflow-hidden text-center"
      aria-labelledby="join-title"
    >
      <div className="bg-gradient-to-b from-brand-50 to-white px-6 pb-4 pt-8">
        <GamePreview gameType={preview.gameType} className="h-28" />
      </div>
      <div className="px-6 pb-8">
        <p className="eyebrow">You're invited</p>
        <h1 id="join-title" className="mt-2 text-2xl font-extrabold">
          {preview.hostName} invited you to play
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Room <span className="font-mono font-bold">{formatRoomCode(preview.roomCode)}</span> ·{' '}
          {preview.playerCount}/2 players · starting with {game.emoji} {game.name}
        </p>
        <Button size="lg" className="mt-6 w-full" onClick={onJoin} loading={joining}>
          <Users className="h-4 w-4" aria-hidden="true" /> Join game
        </Button>
      </div>
    </section>
  );
}

const gateSchema = z.object({ displayName: displayNameSchema });

/** Shown when someone opens an invite link without an identity: pick a name, then auto-join. */
function InvitedGate({ roomCode, onIdentity }: { roomCode: string; onIdentity: () => void }) {
  const { ensure } = useEnsureIdentity();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.input<typeof gateSchema>>({
    resolver: zodResolver(gateSchema),
  });

  const onSubmit = handleSubmit(async ({ displayName }) => {
    setError(null);
    try {
      onIdentity();
      await ensure(displayName);
    } catch (err) {
      setError(toApiError(err).message);
    }
  });

  return (
    <section
      className="card mx-auto max-w-md animate-fade-up p-6 sm:p-8"
      aria-labelledby="gate-title"
    >
      <p className="eyebrow">You're invited</p>
      <h1 id="gate-title" className="mt-2 text-2xl font-extrabold">
        Join room {formatRoomCode(roomCode)}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Pick a name your partner will see. No sign-up, ever.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <GuestNameField
          registration={register('displayName')}
          error={formState.errors.displayName?.message}
        />
        {error && (
          <p role="alert" className="text-sm font-medium text-xmark-dark">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
          Join game <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </section>
  );
}
