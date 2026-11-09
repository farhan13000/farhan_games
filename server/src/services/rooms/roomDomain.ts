import { randomInt } from 'node:crypto';
import {
  ACTIVE_ROOM_STATUSES,
  GAME_CATALOG,
  applyMove,
  createInitialGameState,
  getNextTurn,
  redactGameState,
  validateMove,
  type EndReason,
  type GameType,
  type MatchEndReason,
  type RoomSnapshot,
} from '@arena/shared';
import { Types } from 'mongoose';
import { AppError } from '../../utils/AppError';
import type { PlayerIdentity, RoomPlayer, RoomPolicy, RoomRecord } from './types';

/**
 * Pure room lifecycle rules. Functions take a RoomRecord and return a new one (or
 * throw AppError); persistence, locking and broadcasting live in RoomService.
 *
 * WAITING_FOR_PLAYER -> READY -> IN_PROGRESS -> COMPLETED -> (both agree) READY ...
 * Players can agree on a rematch or a different game at any point after joining,
 * so one room supports unlimited rounds across all games.
 * Any active state -> CANCELLED (host closed / player left / player timed out)
 * Any active state -> EXPIRED  (waiting TTL or idle TTL elapsed)
 */

const RECENT_MOVE_IDS_LIMIT = 50;

/** CSPRNG-backed random source for shuffling cards and questions. */
export const secureRng = () => randomInt(0, 2 ** 31) / 2 ** 31;

export function isActive(room: RoomRecord): boolean {
  return ACTIVE_ROOM_STATUSES.includes(room.status);
}

export function findPlayer(room: RoomRecord, playerId: string): RoomPlayer | undefined {
  return room.players.find((p) => p.playerId === playerId);
}

export function getOpponent(room: RoomRecord, playerId: string): RoomPlayer | undefined {
  return room.players.find((p) => p.playerId !== playerId);
}

export function assertJoinable(room: RoomRecord | null): asserts room is RoomRecord {
  if (!room) throw new AppError('ROOM_NOT_FOUND');
  if (room.status === 'EXPIRED') throw new AppError('ROOM_EXPIRED');
  if (room.status === 'CANCELLED') throw new AppError('ROOM_CLOSED');
}

function newPlayer(identity: PlayerIdentity, mark: 'X' | 'O', now: Date): RoomPlayer {
  return {
    playerId: identity.playerId,
    displayName: identity.displayName,
    mark,
    connected: true,
    joinedAt: now,
    lastSeenAt: now,
    disconnectedAt: null,
    wins: 0,
  };
}

export function createRoomRecord(params: {
  roomCode: string;
  gameType: GameType;
  host: PlayerIdentity;
  now: Date;
  policy: RoomPolicy;
}): RoomRecord {
  const { roomCode, gameType, host, now, policy } = params;
  return {
    _id: new Types.ObjectId(),
    roomCode,
    gameType,
    hostPlayerId: host.playerId,
    // The host is always X in round one.
    players: [newPlayer(host, 'X', now)],
    status: 'WAITING_FOR_PLAYER',
    game: createInitialGameState(gameType, secureRng),
    roundNumber: 1,
    roundVersion: 1,
    rematchVotes: [],
    nextGameType: gameType,
    draws: 0,
    recentMoveIds: [],
    stateVersion: 1,
    endReason: null,
    lastActivityAt: now,
    expiresAt: new Date(now.getTime() + policy.roomWaitingTtlMs),
    purgeAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

function touch(room: RoomRecord, now: Date, policy: RoomPolicy): RoomRecord {
  const ttl = room.status === 'WAITING_FOR_PLAYER' ? null : policy.roomIdleTtlMs;
  return {
    ...room,
    lastActivityAt: now,
    expiresAt: ttl === null ? room.expiresAt : new Date(now.getTime() + ttl),
  };
}

/** Adds the second player. Re-joining an existing member returns the room unchanged. */
export function addPlayer(
  room: RoomRecord,
  identity: PlayerIdentity,
  now: Date,
  policy: RoomPolicy,
): { room: RoomRecord; added: boolean } {
  assertJoinable(room);
  if (findPlayer(room, identity.playerId)) return { room, added: false };
  if (room.players.length >= 2 || room.status !== 'WAITING_FOR_PLAYER') {
    throw new AppError('ROOM_FULL');
  }
  const next: RoomRecord = {
    ...room,
    players: [...room.players, newPlayer(identity, 'O', now)],
    status: 'READY',
  };
  return { room: touch(next, now, policy), added: true };
}

export function setConnection(
  room: RoomRecord,
  playerId: string,
  connected: boolean,
  now: Date,
): { room: RoomRecord; changed: boolean } {
  const player = findPlayer(room, playerId);
  if (!player || player.connected === connected) return { room, changed: false };
  return {
    changed: true,
    room: {
      ...room,
      players: room.players.map((p) =>
        p.playerId === playerId
          ? { ...p, connected, lastSeenAt: now, disconnectedAt: connected ? null : now }
          : p,
      ),
    },
  };
}

export interface MoveCommand {
  playerId: string;
  index: number;
  moveId: string;
  roundVersion: number;
  expectedStep: number;
}

export interface RoundOutcome {
  winnerPlayerId: string | null;
  isDraw: boolean;
  reason: MatchEndReason;
}

export function applyPlayerMove(
  room: RoomRecord,
  cmd: MoveCommand,
  now: Date,
  policy: RoomPolicy,
): { room: RoomRecord; outcome: RoundOutcome | null } {
  const player = findPlayer(room, cmd.playerId);
  if (!player) throw new AppError('NOT_A_MEMBER');
  if (!isActive(room)) throw new AppError('ROOM_CLOSED');
  if (room.status === 'WAITING_FOR_PLAYER') {
    throw new AppError('GAME_NOT_IN_PROGRESS', 'Waiting for your partner to join.');
  }
  if (cmd.roundVersion !== room.roundVersion) throw new AppError('STALE_ROUND');
  if (room.recentMoveIds.includes(cmd.moveId)) throw new AppError('DUPLICATE_MOVE');
  if (room.status === 'COMPLETED') throw new AppError('GAME_NOT_IN_PROGRESS');
  if (cmd.expectedStep !== room.game.step) throw new AppError('STALE_STATE');

  const validation = validateMove(room.game, cmd.index, player.mark);
  if (!validation.ok) throw new AppError(validation.code, validation.message);

  const game = applyMove(room.game, cmd.index, player.mark);
  let next: RoomRecord = {
    ...room,
    game,
    status: game.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
    recentMoveIds: [...room.recentMoveIds, cmd.moveId].slice(-RECENT_MOVE_IDS_LIMIT),
  };

  let outcome: RoundOutcome | null = null;
  if (game.status === 'COMPLETED') {
    const winner = game.winner ? next.players.find((p) => p.mark === game.winner) : undefined;
    outcome = { winnerPlayerId: winner?.playerId ?? null, isDraw: game.isDraw, reason: 'NORMAL' };
    next = creditOutcome(next, outcome);
  }
  return { room: touch(next, now, policy), outcome };
}

function creditOutcome(room: RoomRecord, outcome: RoundOutcome): RoomRecord {
  // Co-op rounds have no loser, so they don't count as series draws.
  const coop = GAME_CATALOG[room.gameType].coop;
  return {
    ...room,
    draws: outcome.isDraw && !coop ? room.draws + 1 : room.draws,
    players: room.players.map((p) =>
      p.playerId === outcome.winnerPlayerId ? { ...p, wins: p.wins + 1 } : p,
    ),
  };
}

/** Starts a new round of `gameType`: fresh state, marks swap so starting alternates. */
export function startNextRound(
  room: RoomRecord,
  gameType: GameType,
  now: Date,
  policy: RoomPolicy,
): RoomRecord {
  const next: RoomRecord = {
    ...room,
    gameType,
    nextGameType: gameType,
    status: 'READY',
    roundNumber: room.roundNumber + 1,
    roundVersion: room.roundVersion + 1,
    game: createInitialGameState(gameType, secureRng),
    players: room.players.map((p) => ({ ...p, mark: getNextTurn(p.mark) })),
    rematchVotes: [],
    recentMoveIds: [],
  };
  return touch(next, now, policy);
}

/**
 * Vote for what to play next. `gameType` proposes a game (defaults to the pending
 * proposal, or a rematch of the current game). A proposal for a different game
 * replaces the previous one. When both players agree, the next round starts
 * immediately; an unfinished round is abandoned without a result.
 * While waiting for a partner, the host can simply change the game.
 */
export function voteNextGame(
  room: RoomRecord,
  playerId: string,
  roundVersion: number,
  accept: boolean,
  gameType: GameType | undefined,
  now: Date,
  policy: RoomPolicy,
): { room: RoomRecord; started: boolean; declined: boolean } {
  if (!findPlayer(room, playerId)) throw new AppError('NOT_A_MEMBER');
  if (!isActive(room)) throw new AppError('ROOM_CLOSED');
  if (roundVersion !== room.roundVersion) throw new AppError('STALE_ROUND');

  if (room.status === 'WAITING_FOR_PLAYER') {
    if (!accept || !gameType) throw new AppError('REMATCH_NOT_AVAILABLE');
    return {
      room: {
        ...room,
        gameType,
        nextGameType: gameType,
        game: createInitialGameState(gameType, secureRng),
      },
      started: true,
      declined: false,
    };
  }
  if (room.players.length !== 2) throw new AppError('REMATCH_NOT_AVAILABLE');

  if (!accept) {
    return {
      room: touch({ ...room, rematchVotes: [] }, now, policy),
      started: false,
      declined: true,
    };
  }

  const pending = room.rematchVotes.length > 0;
  const target = gameType ?? (pending ? room.nextGameType : room.gameType);
  const votes =
    pending && target === room.nextGameType
      ? Array.from(new Set([...room.rematchVotes, playerId]))
      : [playerId];

  if (room.players.every((p) => votes.includes(p.playerId))) {
    return { room: startNextRound(room, target, now, policy), started: true, declined: false };
  }
  return {
    room: touch({ ...room, nextGameType: target, rematchVotes: votes }, now, policy),
    started: false,
    declined: false,
  };
}

function endRoom(
  room: RoomRecord,
  status: 'CANCELLED' | 'EXPIRED',
  reason: EndReason,
  now: Date,
  policy: RoomPolicy,
): RoomRecord {
  return {
    ...room,
    status,
    endReason: reason,
    rematchVotes: [],
    lastActivityAt: now,
    purgeAt: new Date(now.getTime() + policy.endedRoomRetentionMs),
  };
}

/** Awards the round to `winnerPlayerId` without a normal finish (forfeit / timeout). */
function forfeitRound(
  room: RoomRecord,
  winnerPlayerId: string,
  reason: MatchEndReason,
): { room: RoomRecord; outcome: RoundOutcome } {
  const winner = findPlayer(room, winnerPlayerId)!;
  const outcome: RoundOutcome = { winnerPlayerId, isDraw: false, reason };
  const next = creditOutcome(
    {
      ...room,
      game: {
        ...room.game,
        status: 'COMPLETED',
        winner: winner.mark,
        isDraw: false,
        winningLine: null,
      },
    },
    outcome,
  );
  return { room: next, outcome };
}

/**
 * Explicit leave. Leaving a waiting room (host) closes it. Leaving a match in
 * progress forfeits the round to the opponent. In every other active state the
 * room is closed for both players.
 */
export function leaveRoom(
  room: RoomRecord,
  playerId: string,
  now: Date,
  policy: RoomPolicy,
): { room: RoomRecord; outcome: RoundOutcome | null } {
  if (!findPlayer(room, playerId)) throw new AppError('NOT_A_MEMBER');
  if (!isActive(room)) return { room, outcome: null };

  if (room.status === 'WAITING_FOR_PLAYER') {
    return { room: endRoom(room, 'CANCELLED', 'HOST_CLOSED', now, policy), outcome: null };
  }
  const opponent = getOpponent(room, playerId);
  if (room.status === 'IN_PROGRESS' && opponent && !GAME_CATALOG[room.gameType].coop) {
    const forfeited = forfeitRound(room, opponent.playerId, 'FORFEIT');
    return {
      room: endRoom(forfeited.room, 'CANCELLED', 'PLAYER_LEFT', now, policy),
      outcome: forfeited.outcome,
    };
  }
  return { room: endRoom(room, 'CANCELLED', 'PLAYER_LEFT', now, policy), outcome: null };
}

/**
 * Applied periodically by the sweeper (restart-safe, as it only depends on persisted
 * timestamps). Returns null when nothing changes.
 */
export function evaluateTimeouts(
  room: RoomRecord,
  now: Date,
  policy: RoomPolicy,
): { room: RoomRecord; outcome: RoundOutcome | null } | null {
  if (!isActive(room)) return null;

  if (room.expiresAt.getTime() <= now.getTime()) {
    return { room: endRoom(room, 'EXPIRED', 'EXPIRED', now, policy), outcome: null };
  }
  if (room.status === 'WAITING_FOR_PLAYER') return null; // host may return until the TTL.

  const graceExpired = (p: RoomPlayer) =>
    !p.connected &&
    p.disconnectedAt !== null &&
    now.getTime() - p.disconnectedAt.getTime() >= policy.reconnectGraceMs;

  const gone = room.players.filter(graceExpired);
  if (gone.length === 0) return null;

  const stayed = room.players.find((p) => p.connected);
  if (!stayed) {
    if (gone.length === room.players.length) {
      return { room: endRoom(room, 'EXPIRED', 'PLAYER_TIMEOUT', now, policy), outcome: null };
    }
    return null; // the other player is still within their grace period
  }

  if (room.status === 'IN_PROGRESS' && !GAME_CATALOG[room.gameType].coop) {
    const forfeited = forfeitRound(room, stayed.playerId, 'TIMEOUT');
    return {
      room: endRoom(forfeited.room, 'CANCELLED', 'PLAYER_TIMEOUT', now, policy),
      outcome: forfeited.outcome,
    };
  }
  return { room: endRoom(room, 'CANCELLED', 'PLAYER_TIMEOUT', now, policy), outcome: null };
}

/** Snapshot for one viewer: secret information is removed for everyone else. */
export function toSnapshot(
  room: RoomRecord,
  policy: RoomPolicy,
  viewerPlayerId: string | null,
): RoomSnapshot {
  const viewerMark = (viewerPlayerId && findPlayer(room, viewerPlayerId)?.mark) || null;
  return {
    roomCode: room.roomCode,
    gameType: room.gameType,
    status: room.status,
    hostPlayerId: room.hostPlayerId,
    players: room.players.map((p) => ({
      playerId: p.playerId,
      displayName: p.displayName,
      mark: p.mark,
      connected: p.connected,
      isHost: p.playerId === room.hostPlayerId,
      wins: p.wins,
    })),
    game: redactGameState(room.game, viewerMark),
    roundNumber: room.roundNumber,
    roundVersion: room.roundVersion,
    rematchVotes: room.rematchVotes,
    nextGameType: room.nextGameType,
    draws: room.draws,
    stateVersion: room.stateVersion,
    endReason: room.endReason,
    expiresAt: room.expiresAt.toISOString(),
    createdAt: room.createdAt.toISOString(),
    reconnectGraceSeconds: Math.round(policy.reconnectGraceMs / 1000),
  };
}
