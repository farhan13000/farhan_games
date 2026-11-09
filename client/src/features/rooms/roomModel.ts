import {
  GAME_CATALOG,
  canAct,
  quizSubject,
  type GameInfo,
  type GameType,
  type Mark,
  type PlayerSnapshot,
  type ReversiExt,
  type RoomSnapshot,
} from '@arena/shared';

export type RoundResult = 'win' | 'loss' | 'draw' | 'coop' | null;
export type Activity = 'turn' | 'locked' | 'idle';

export interface Proposal {
  gameType: GameType;
  iVoted: boolean;
  opponentVoted: boolean;
  isRematch: boolean;
}

export interface RoomView {
  me: PlayerSnapshot | null;
  opponent: PlayerSnapshot | null;
  myMark: Mark | null;
  playerX: PlayerSnapshot | null;
  playerO: PlayerSnapshot | null;
  names: Record<Mark, string>;
  isWaiting: boolean;
  isRoundActive: boolean;
  isRoundOver: boolean;
  isEnded: boolean;
  isMyTurn: boolean;
  turnPlayer: PlayerSnapshot | null;
  winner: PlayerSnapshot | null;
  result: RoundResult;
  proposal: Proposal | null;
  info: GameInfo;
  gameName: string;
}

/** Pure derivation of everything the room UI needs from the authoritative snapshot. */
export function deriveRoomView(snapshot: RoomSnapshot, myPlayerId: string | null): RoomView {
  const me = snapshot.players.find((p) => p.playerId === myPlayerId) ?? null;
  const opponent = snapshot.players.find((p) => p.playerId !== myPlayerId) ?? null;
  const { game, status } = snapshot;
  const info = GAME_CATALOG[snapshot.gameType];
  const isRoundActive = status === 'READY' || status === 'IN_PROGRESS';
  const isEnded = status === 'CANCELLED' || status === 'EXPIRED';
  const winner = game.winner
    ? (snapshot.players.find((p) => p.mark === game.winner) ?? null)
    : null;
  const playerX = snapshot.players.find((p) => p.mark === 'X') ?? null;
  const playerO = snapshot.players.find((p) => p.mark === 'O') ?? null;

  let result: RoundResult = null;
  if (game.status === 'COMPLETED' && me) {
    if (info.coop) result = 'coop';
    else if (game.isDraw) result = 'draw';
    else result = winner?.playerId === me.playerId ? 'win' : 'loss';
  }

  const votes = snapshot.rematchVotes;
  const proposal: Proposal | null =
    votes.length > 0
      ? {
          gameType: snapshot.nextGameType,
          iVoted: !!me && votes.includes(me.playerId),
          opponentVoted: !!opponent && votes.includes(opponent.playerId),
          isRematch: snapshot.nextGameType === snapshot.gameType,
        }
      : null;

  return {
    me,
    opponent,
    myMark: me?.mark ?? null,
    playerX,
    playerO,
    names: { X: playerX?.displayName ?? 'Player X', O: playerO?.displayName ?? 'Player O' },
    isWaiting: status === 'WAITING_FOR_PLAYER',
    isRoundActive,
    isRoundOver: status === 'COMPLETED',
    isEnded,
    isMyTurn: isRoundActive && canAct(game, me?.mark ?? null),
    turnPlayer:
      game.turnMode === 'alternate'
        ? (snapshot.players.find((p) => p.mark === game.currentTurn) ?? null)
        : null,
    winner,
    result,
    proposal,
    info,
    gameName: info.name,
  };
}

/** What a player card should say: whose turn it is, or who has locked in. */
export function activityOf(snapshot: RoomSnapshot, mark: Mark, view: RoomView): Activity {
  if (!view.isRoundActive) return 'idle';
  const { game } = snapshot;
  if (game.turnMode === 'simultaneous') return game.submitted[mark] ? 'locked' : 'turn';
  return game.currentTurn === mark ? 'turn' : 'idle';
}

const SCORE_LABELS: Partial<Record<GameType, string>> = {
  'dots-and-boxes': 'boxes',
  reversi: 'discs',
  mancala: 'seeds',
  'memory-match': 'pairs',
  'rock-paper-scissors': 'points',
  'know-me': 'points',
  'ultimate-tic-tac-toe': 'boards',
  'in-sync': 'synced',
};

/** Label for the in-round score shown on player cards, or null to show series wins. */
export function roundScoreLabel(gameType: GameType): string | null {
  return SCORE_LABELS[gameType] ?? null;
}

export function syncVerdict(score: number, total: number): string {
  const pct = score / total;
  if (pct >= 0.9) return 'Soulmates! 💘';
  if (pct >= 0.7) return 'Totally in sync ✨';
  if (pct >= 0.5) return 'Pretty aligned 🤝';
  if (pct >= 0.3) return 'Opposites attract 🧲';
  return 'Delightfully different 🌈';
}

export function statusMessage(snapshot: RoomSnapshot, view: RoomView): string {
  const { game } = snapshot;
  const oppName = view.opponent?.displayName ?? 'your partner';
  if (view.isWaiting) return 'Waiting for your partner to join…';
  if (view.isEnded) return 'This room is closed.';
  if (game.status === 'COMPLETED') {
    if (view.result === 'coop') return `You synced on ${game.scores.X} of 10!`;
    if (view.result === 'draw') return "It's a draw!";
    if (view.result === 'win') return 'You won this round!';
    return `${view.winner?.displayName ?? 'Your partner'} won this round.`;
  }
  if (game.turnMode === 'simultaneous') {
    if (!view.isMyTurn) return `Locked in. Waiting for ${oppName}…`;
    if (game.ext?.kind === 'quiz') {
      const subject = quizSubject(game.ext);
      if (subject && subject === view.myMark) return 'Answer about yourself';
      if (subject) return `Guess ${oppName}'s answer`;
      return 'Pick your answer';
    }
    return 'Make your pick';
  }
  if (view.isMyTurn) {
    if (game.ext?.kind === 'memory' && game.ext.flipped.length === 1) return 'Flip a second card';
    return 'Your turn';
  }
  return `${view.turnPlayer?.displayName ?? 'Partner'}'s turn`;
}

/** Extra context line under the status (pass notices, extra turns, forced boards). */
export function statusHint(snapshot: RoomSnapshot, view: RoomView): string | null {
  const ext = snapshot.game.ext;
  if (snapshot.game.status !== 'IN_PROGRESS') return null;
  if (ext?.kind === 'reversi' && (ext as ReversiExt).passed) {
    const passed = (ext as ReversiExt).passed!;
    return `${passed === view.myMark ? 'You had' : `${view.names[passed]} had`} no legal move, so the turn was skipped.`;
  }
  if (ext?.kind === 'uttt')
    return ext.forced === null ? 'Play in any open board' : `Play in board ${ext.forced + 1}`;
  if (ext?.kind === 'mancala' && ext.extraTurn) return 'Landed in the store: extra turn!';
  if (snapshot.gameType === 'dots-and-boxes') return 'Close a box to go again';
  if (ext?.kind === 'memory') return 'Find a pair to go again';
  return null;
}
