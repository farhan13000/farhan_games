import type {
  GameType,
  PlayerEventPayload,
  PlayerStatusPayload,
  RematchStatusPayload,
  RoomClosedPayload,
  RoomPreview,
  RoomSnapshot,
  RoundCompletedPayload,
} from '@arena/shared';
import type { Logger } from 'pino';
import { GameMove } from '../../models/GameMove';
import { AppError, isDuplicateKeyError } from '../../utils/AppError';
import { recordMatchResult } from '../matches/matchService';
import { KeyedMutex } from './roomLock';
import { generateRoomCode, withUniqueRoomCode, type CodeGenerator } from './roomCode';
import {
  addPlayer,
  applyPlayerMove,
  assertJoinable,
  createRoomRecord,
  evaluateTimeouts,
  findPlayer,
  isActive,
  leaveRoom,
  setConnection,
  toSnapshot,
  voteNextGame,
  type MoveCommand,
  type RoundOutcome,
} from './roomDomain';
import * as repo from './roomRepository';
import type { PlayerIdentity, RoomPolicy, RoomRecord } from './types';

/**
 * Transport-agnostic broadcaster implemented by the Socket.IO layer. State
 * broadcasts receive the full record so a per-player (redacted) snapshot can be
 * built for each member.
 */
export interface RoomBroadcaster {
  roomState(room: RoomRecord): void;
  gameState(room: RoomRecord): void;
  playerJoined(payload: PlayerEventPayload): void;
  playerLeft(payload: PlayerEventPayload): void;
  playerStatus(payload: PlayerStatusPayload): void;
  roundCompleted(payload: RoundCompletedPayload): void;
  rematchStatus(payload: RematchStatusPayload): void;
  roomClosed(payload: RoomClosedPayload): void;
}

export const nullBroadcaster: RoomBroadcaster = {
  roomState: () => {},
  gameState: () => {},
  playerJoined: () => {},
  playerLeft: () => {},
  playerStatus: () => {},
  roundCompleted: () => {},
  rematchStatus: () => {},
  roomClosed: () => {},
};

export interface RoomServiceOptions {
  policy: RoomPolicy;
  logger: Logger;
  broadcaster?: RoomBroadcaster;
  codeGenerator?: CodeGenerator;
  now?: () => Date;
}

/**
 * Orchestrates room operations: serializes per room, applies pure domain rules,
 * persists with optimistic concurrency, records results and broadcasts snapshots.
 */
export class RoomService {
  private readonly lock = new KeyedMutex();
  private readonly policy: RoomPolicy;
  private readonly logger: Logger;
  private readonly codeGenerator: CodeGenerator;
  private readonly now: () => Date;
  broadcaster: RoomBroadcaster;

  constructor(options: RoomServiceOptions) {
    this.policy = options.policy;
    this.logger = options.logger;
    this.broadcaster = options.broadcaster ?? nullBroadcaster;
    this.codeGenerator = options.codeGenerator ?? generateRoomCode;
    this.now = options.now ?? (() => new Date());
  }

  /** Snapshot as seen by `viewerPlayerId` (secrets of other players removed). */
  snapshot(room: RoomRecord, viewerPlayerId: string | null): RoomSnapshot {
    return toSnapshot(room, this.policy, viewerPlayerId);
  }

  /** Loads, mutates and saves a room under its lock. */
  private async mutate<T>(
    roomCode: string,
    fn: (room: RoomRecord | null) => Promise<{ room: RoomRecord; changed: boolean; result: T }>,
  ): Promise<{ room: RoomRecord; result: T }> {
    return this.lock.run(roomCode, async () => {
      const current = await repo.findRoomByCode(roomCode);
      const { room, changed, result } = await fn(current);
      if (!changed || !current) return { room, result };
      const saved = await repo.saveRoom(room, current.stateVersion);
      return { room: saved, result };
    });
  }

  async createRoom(host: PlayerIdentity, gameType: GameType): Promise<RoomSnapshot> {
    // A host keeps at most one waiting room: creating a new one closes older ones.
    for (const old of await repo.findActiveRoomsHostedBy(host.playerId)) {
      await this.leave(old.roomCode, host).catch((err) =>
        this.logger.warn({ err, roomCode: old.roomCode }, 'Failed to close previous waiting room'),
      );
    }
    const room = await withUniqueRoomCode(
      (roomCode) =>
        repo.insertRoom(
          createRoomRecord({ roomCode, gameType, host, now: this.now(), policy: this.policy }),
        ),
      this.codeGenerator,
    );
    this.logger.info({ roomCode: room.roomCode, gameType }, 'Room created');
    return this.snapshot(room, host.playerId);
  }

  /** Latest snapshot for a member (used to resync a client after a rejected action). */
  async snapshotForMember(roomCode: string, playerId: string): Promise<RoomSnapshot | null> {
    const room = await repo.findRoomByCode(roomCode);
    return room && findPlayer(room, playerId) ? this.snapshot(room, playerId) : null;
  }

  async preview(roomCode: string, identity: PlayerIdentity): Promise<RoomPreview> {
    const room = await repo.findRoomByCode(roomCode);
    assertJoinable(room);
    const isMember = Boolean(findPlayer(room, identity.playerId));
    const host = findPlayer(room, room.hostPlayerId);
    return {
      roomCode: room.roomCode,
      gameType: room.gameType,
      status: room.status,
      hostName: host?.displayName ?? 'Host',
      playerCount: room.players.length,
      joinable: isMember || (room.status === 'WAITING_FOR_PLAYER' && room.players.length < 2),
      isMember,
    };
  }

  async join(roomCode: string, identity: PlayerIdentity): Promise<RoomSnapshot> {
    const { room, result: added } = await this.mutate(roomCode, async (current) => {
      assertJoinable(current);
      const { room: next, added } = addPlayer(current, identity, this.now(), this.policy);
      const connected = setConnection(next, identity.playerId, true, this.now());
      return { room: connected.room, changed: added || connected.changed, result: added };
    });
    if (added) {
      this.broadcaster.playerJoined({
        roomCode,
        playerId: identity.playerId,
        displayName: identity.displayName,
      });
    }
    this.broadcaster.roomState(room);
    return this.snapshot(room, identity.playerId);
  }

  /** Restores an existing membership. Never creates a new player slot. */
  async reconnect(roomCode: string, identity: PlayerIdentity): Promise<RoomSnapshot> {
    const room = await repo.findRoomByCode(roomCode);
    if (!room) throw new AppError('ROOM_NOT_FOUND');
    if (!findPlayer(room, identity.playerId)) throw new AppError('NOT_A_MEMBER');
    if (!isActive(room)) return this.snapshot(room, identity.playerId);
    return this.setPresence(roomCode, identity.playerId, true);
  }

  async setPresence(roomCode: string, playerId: string, connected: boolean): Promise<RoomSnapshot> {
    const { room, result: changed } = await this.mutate(roomCode, async (current) => {
      if (!current) throw new AppError('ROOM_NOT_FOUND');
      if (!isActive(current)) return { room: current, changed: false, result: false };
      const res = setConnection(current, playerId, connected, this.now());
      return { room: res.room, changed: res.changed, result: res.changed };
    });
    if (changed) {
      const player = findPlayer(room, playerId);
      this.broadcaster.playerStatus({
        roomCode,
        playerId,
        displayName: player?.displayName ?? '',
        connected,
      });
      this.broadcaster.roomState(room);
    }
    return this.snapshot(room, playerId);
  }

  async makeMove(roomCode: string, cmd: MoveCommand): Promise<RoomSnapshot> {
    const { room, result: outcome } = await this.mutate(roomCode, async (current) => {
      if (!current) throw new AppError('ROOM_NOT_FOUND');
      const { room: next, outcome } = applyPlayerMove(current, cmd, this.now(), this.policy);
      const player = findPlayer(next, cmd.playerId)!;
      try {
        await GameMove.create({
          roomId: next._id,
          roomCode,
          roundVersion: next.roundVersion,
          moveNumber: next.game.moveCount,
          playerId: cmd.playerId,
          mark: player.mark,
          index: cmd.index,
          cell: next.game.lastMove?.cell ?? cmd.index,
          moveId: cmd.moveId,
        });
      } catch (err) {
        if (isDuplicateKeyError(err)) throw new AppError('DUPLICATE_MOVE');
        throw err;
      }
      return { room: next, changed: true, result: outcome };
    });
    this.broadcaster.gameState(room);
    if (outcome) await this.finishRound(room, outcome);
    return this.snapshot(room, cmd.playerId);
  }

  /** Votes to start the next round (rematch or a different game), or declines. */
  async voteNext(
    roomCode: string,
    playerId: string,
    roundVersion: number,
    accept: boolean,
    gameType?: GameType,
  ): Promise<RoomSnapshot> {
    const { room, result } = await this.mutate(roomCode, async (current) => {
      if (!current) throw new AppError('ROOM_NOT_FOUND');
      const res = voteNextGame(
        current,
        playerId,
        roundVersion,
        accept,
        gameType,
        this.now(),
        this.policy,
      );
      return { room: res.room, changed: true, result: res };
    });
    this.broadcaster.rematchStatus({
      roomCode,
      roundVersion: room.roundVersion,
      votes: room.rematchVotes,
      nextGameType: room.nextGameType,
      declinedBy: result.declined ? playerId : null,
    });
    this.broadcaster.roomState(room);
    return this.snapshot(room, playerId);
  }

  async leave(roomCode: string, identity: PlayerIdentity): Promise<void> {
    const { room, result: outcome } = await this.mutate(roomCode, async (current) => {
      if (!current) throw new AppError('ROOM_NOT_FOUND');
      const wasActive = isActive(current);
      const res = leaveRoom(current, identity.playerId, this.now(), this.policy);
      return { room: res.room, changed: wasActive, result: res.outcome };
    });
    this.broadcaster.playerLeft({
      roomCode,
      playerId: identity.playerId,
      displayName: identity.displayName,
    });
    if (outcome) await this.finishRound(room, outcome);
    this.broadcaster.roomState(room);
    if (room.endReason) this.broadcaster.roomClosed({ roomCode, reason: room.endReason });
  }

  /** Applies timeout/expiry policy to every room that needs it. Restart-safe. */
  async sweep(): Promise<number> {
    const now = this.now();
    const codes = await repo.findRoomsNeedingSweep(now, this.policy.reconnectGraceMs);
    let changedCount = 0;
    for (const roomCode of codes) {
      try {
        const { room, result } = await this.mutate(roomCode, async (current) => {
          if (!current) return { room: current!, changed: false, result: null };
          const res = evaluateTimeouts(current, this.now(), this.policy);
          if (!res) return { room: current, changed: false, result: null };
          return { room: res.room, changed: true, result: res };
        });
        if (!result) continue;
        changedCount++;
        if (result.outcome) await this.finishRound(room, result.outcome);
        this.broadcaster.roomState(room);
        if (room.endReason) this.broadcaster.roomClosed({ roomCode, reason: room.endReason });
        this.logger.info({ roomCode, status: room.status, reason: room.endReason }, 'Room swept');
      } catch (err) {
        this.logger.error({ err, roomCode }, 'Room sweep failed');
      }
    }
    return changedCount;
  }

  async recoverAfterRestart(): Promise<void> {
    const count = await repo.markAllPlayersDisconnected(this.now());
    if (count) this.logger.info({ rooms: count }, 'Recovered active rooms after restart');
  }

  private async finishRound(room: RoomRecord, outcome: RoundOutcome): Promise<void> {
    try {
      await recordMatchResult(room, outcome, this.now());
    } catch (err) {
      this.logger.error({ err, roomCode: room.roomCode }, 'Failed to persist match result');
    }
    this.broadcaster.roundCompleted({
      roomCode: room.roomCode,
      roundVersion: room.roundVersion,
      winnerPlayerId: outcome.winnerPlayerId,
      isDraw: outcome.isDraw,
      reason: outcome.reason,
    });
  }
}
