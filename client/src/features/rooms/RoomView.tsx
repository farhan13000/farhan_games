import { Check, Link2, LogOut, Shuffle } from 'lucide-react';
import { useState } from 'react';
import {
  formatRoomCode,
  type ChatMessage,
  type GameType,
  type ReactionEmoji,
  type ReactionEvent,
  type RoomSnapshot,
} from '@arena/shared';
import { Button } from '../../components/common/Button';
import { Confetti } from '../../components/game/Confetti';
import { GameBoard } from '../../components/game/GameBoard';
import { ChatPanel } from '../../components/room/ChatPanel';
import { ConnectionBanner } from '../../components/room/ConnectionBanner';
import { EndedPanel } from '../../components/room/EndedPanel';
import { GameMenuSheet } from '../../components/room/GameMenu';
import { InvitePanel } from '../../components/room/InvitePanel';
import { NextGamePanel, ProposalBanner } from '../../components/room/NextGamePanel';
import { PlayerCard } from '../../components/room/PlayerCard';
import { FloatingReactions, ReactionBar } from '../../components/room/Reactions';
import { StatusBar } from '../../components/room/StatusBar';
import { useCopy } from '../../hooks/useCopy';
import { inviteUrl } from '../../lib/config';
import type { ConnectionStatus } from '../../lib/socket';
import { activityOf, deriveRoomView, roundScoreLabel } from './roomModel';

export interface RoomViewProps {
  snapshot: RoomSnapshot;
  myPlayerId: string | null;
  connection: ConnectionStatus;
  pendingMove: boolean;
  busy: { rematch: boolean; leave: boolean; create: boolean };
  chatEnabled: boolean;
  chat: ChatMessage[];
  reactions: ReactionEvent[];
  onMove: (index: number) => void;
  /** Propose the next round: a rematch (no argument) or a specific game. */
  onPropose: (gameType?: GameType) => void;
  onRespond: (accept: boolean) => void;
  onLeave: () => void;
  onNewRoom: () => void;
  onRetryConnection: () => void;
  onSendChat: (text: string) => Promise<boolean>;
  onReact: (emoji: ReactionEmoji) => void;
  onReactionDone: (id: string) => void;
}

/** Pure presentation of a room snapshot; all side effects are passed in as callbacks. */
export function RoomView(props: RoomViewProps) {
  const { snapshot, myPlayerId, connection } = props;
  const view = deriveRoomView(snapshot, myPlayerId);
  const { copied, copy } = useCopy();
  const [menuOpen, setMenuOpen] = useState(false);
  const connected = connection === 'connected';
  const { info } = view;

  if (view.isEnded) {
    return (
      <EndedPanel
        snapshot={snapshot}
        view={view}
        onNewRoom={props.onNewRoom}
        creating={props.busy.create}
      />
    );
  }

  if (view.isWaiting) {
    return (
      <>
        <ConnectionBanner status={connection} onRetry={props.onRetryConnection} />
        <InvitePanel
          roomCode={snapshot.roomCode}
          gameType={snapshot.gameType}
          expiresAt={snapshot.expiresAt}
          onCancel={props.onLeave}
          cancelling={props.busy.leave}
          onChangeGame={() => setMenuOpen(true)}
        />
        <GameMenuSheet
          open={menuOpen}
          title="Pick the first game"
          note="You can switch to any other game once your partner joins."
          current={snapshot.gameType}
          onPick={(g) => props.onPropose(g)}
          onClose={() => setMenuOpen(false)}
        />
      </>
    );
  }

  const interactive = view.isMyTurn && connected && !props.pendingMove;
  const label = roundScoreLabel(snapshot.gameType);
  const scoreFor = (mark: 'X' | 'O') =>
    label ? { value: snapshot.game.scores[mark], label } : undefined;

  return (
    <div>
      <ConnectionBanner status={connection} onRetry={props.onRetryConnection} />
      {(view.result === 'win' || (view.result === 'coop' && snapshot.game.scores.X >= 7)) && (
        <Confetti burstKey={`${snapshot.roomCode}-${snapshot.roundVersion}`} />
      )}

      {/* Room header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-line bg-white text-2xl sm:flex"
            aria-hidden="true"
          >
            {info.emoji}
          </span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{info.name}</h1>
            <p className="text-xs font-medium text-ink-muted">
              Room{' '}
              <span className="font-mono font-bold text-ink-soft">
                {formatRoomCode(snapshot.roomCode)}
              </span>{' '}
              · Round {snapshot.roundNumber}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="soft"
            size="sm"
            onClick={() => setMenuOpen(true)}
            disabled={!connected || !view.opponent?.connected}
          >
            <Shuffle className="h-4 w-4" aria-hidden="true" /> Switch game
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => copy('invite', inviteUrl(snapshot.roomCode))}
          >
            {copied === 'invite' ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Link2 className="h-4 w-4" aria-hidden="true" />
            )}
            {copied === 'invite' ? 'Copied' : 'Invite link'}
          </Button>
          <Button variant="ghost" size="sm" onClick={props.onLeave} loading={props.busy.leave}>
            <LogOut className="h-4 w-4" aria-hidden="true" /> Leave
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <PlayerCard
              player={view.playerX}
              mark="X"
              isMe={view.playerX?.playerId === myPlayerId}
              activity={activityOf(snapshot, 'X', view)}
              roundScore={scoreFor('X')}
            />
            <PlayerCard
              player={view.playerO}
              mark="O"
              isMe={view.playerO?.playerId === myPlayerId}
              activity={activityOf(snapshot, 'O', view)}
              roundScore={scoreFor('O')}
            />
          </div>

          {view.isRoundActive && view.proposal && (
            <ProposalBanner view={view} busy={props.busy.rematch} onRespond={props.onRespond} />
          )}

          <StatusBar snapshot={snapshot} view={view} />

          <div className="relative py-1">
            <GameBoard
              game={snapshot.game}
              myMark={view.myMark}
              interactive={interactive}
              onMove={props.onMove}
              names={view.names}
            />
            <FloatingReactions
              reactions={props.reactions}
              myPlayerId={myPlayerId}
              onDone={props.onReactionDone}
            />
          </div>

          {view.isRoundOver && (
            <NextGamePanel
              snapshot={snapshot}
              view={view}
              busy={props.busy.rematch}
              onPropose={props.onPropose}
              onRespond={props.onRespond}
              onLeave={props.onLeave}
            />
          )}

          <ReactionBar onReact={props.onReact} disabled={!connected} />
        </div>

        <aside className="flex flex-col gap-5">
          <div className="card p-5">
            <h2 className="font-bold">How to play</h2>
            <ul className="mt-2 space-y-2 text-sm text-ink-soft">
              {info.rules.map((rule) => (
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
          {props.chatEnabled && (
            <ChatPanel
              messages={props.chat}
              myPlayerId={myPlayerId}
              disabled={!connected}
              onSend={props.onSendChat}
            />
          )}
        </aside>
      </div>

      <GameMenuSheet
        open={menuOpen}
        title="Switch game"
        note={
          view.isRoundActive && snapshot.game.moveCount > 0
            ? `${view.opponent?.displayName ?? 'Your partner'} must agree. The current round won't count.`
            : `${view.opponent?.displayName ?? 'Your partner'} will be asked to agree.`
        }
        current={snapshot.gameType}
        onPick={(g) => props.onPropose(g)}
        onClose={() => setMenuOpen(false)}
      />
    </div>
  );
}
