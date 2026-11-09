import type { EndReason, GameState, GameType, Mark, RoomStatus } from '@arena/shared';
import type { Types } from 'mongoose';

/** Authenticated identity of a connected player (derived server-side, never from payloads). */
export interface PlayerIdentity {
  sessionId: string;
  playerId: string;
  displayName: string;
}

export interface RoomPlayer {
  playerId: string;
  displayName: string;
  mark: Mark;
  connected: boolean;
  joinedAt: Date;
  lastSeenAt: Date;
  disconnectedAt: Date | null;
  wins: number;
}

/** Plain-object representation of a GameRoom document used by the pure domain layer. */
export interface RoomRecord {
  _id: Types.ObjectId;
  roomCode: string;
  gameType: GameType;
  hostPlayerId: string;
  players: RoomPlayer[];
  status: RoomStatus;
  /** Full, unredacted game state. Never sent to clients as-is. */
  game: GameState;
  roundNumber: number;
  roundVersion: number;
  /** Players who agreed to start `nextGameType` as the next round. */
  rematchVotes: string[];
  nextGameType: GameType;
  draws: number;
  /** Bounded list (last 50) of applied move IDs for idempotency within a round. */
  recentMoveIds: string[];
  stateVersion: number;
  endReason: EndReason | null;
  lastActivityAt: Date;
  expiresAt: Date;
  /** Set once the room ends; a TTL index deletes the document after this date. */
  purgeAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomPolicy {
  roomWaitingTtlMs: number;
  roomIdleTtlMs: number;
  reconnectGraceMs: number;
  endedRoomRetentionMs: number;
}
