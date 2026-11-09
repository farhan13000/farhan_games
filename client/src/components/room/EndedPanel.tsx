import { DoorClosed, Home, Plus } from 'lucide-react';
import type { RoomSnapshot } from '@arena/shared';
import type { RoomView } from '../../features/rooms/roomModel';
import { Button, ButtonLink } from '../common/Button';

function reasonText(snapshot: RoomSnapshot, view: RoomView): string {
  const name = view.opponent?.displayName ?? 'Your opponent';
  switch (snapshot.endReason) {
    case 'HOST_CLOSED':
      return view.me?.isHost ? 'You closed this room.' : 'The host closed this room.';
    case 'PLAYER_LEFT':
      return view.result === 'win'
        ? `${name} left the match. You win by forfeit.`
        : `${name} left the room.`;
    case 'PLAYER_TIMEOUT':
      return view.result === 'win'
        ? `${name} didn't reconnect in time. You win by timeout.`
        : 'A player did not reconnect in time, so the room was closed.';
    case 'EXPIRED':
    default:
      return 'This room expired due to inactivity.';
  }
}

export function EndedPanel({
  snapshot,
  view,
  onNewRoom,
  creating,
}: {
  snapshot: RoomSnapshot;
  view: RoomView;
  onNewRoom: () => void;
  creating: boolean;
}) {
  return (
    <section
      className="card mx-auto max-w-lg animate-fade-up p-8 text-center"
      aria-labelledby="ended-title"
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <DoorClosed className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 id="ended-title" className="mt-4 text-xl font-extrabold">
        Room closed
      </h1>
      <p className="mt-2 text-sm text-ink-soft">{reasonText(snapshot, view)}</p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Button onClick={onNewRoom} loading={creating}>
          <Plus className="h-4 w-4" aria-hidden="true" /> New {view.gameName} room
        </Button>
        <ButtonLink to="/" variant="secondary">
          <Home className="h-4 w-4" aria-hidden="true" /> Home
        </ButtonLink>
      </div>
    </section>
  );
}
