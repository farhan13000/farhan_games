import type { EndReason, Mark, RoomStatus } from './constants';
import type { ErrorCode } from './errors';
import type { GameState, GameType } from './games/types';

/** Consistent envelope for REST responses and Socket.IO acknowledgements. */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}
export interface ApiErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
}
export interface ApiFailure {
  ok: false;
  error: ApiErrorBody;
}
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
export type Ack<T> = ApiResponse<T>;

export interface FeatureFlags {
  chat: boolean;
}

export interface PublicProfile {
  /** Stable, non-secret player identity used in rooms. */
  playerId: string;
  displayName: string;
}

export interface AuthPayload {
  accessToken: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
  profile: PublicProfile;
  features: FeatureFlags;
}

export interface PlayerSnapshot {
  playerId: string;
  displayName: string;
  mark: Mark;
  connected: boolean;
  isHost: boolean;
  wins: number;
}

/**
 * Authoritative room + game snapshot. Built per viewer: secret information
 * (an opponent's locked-in pick, face-down cards) is removed before sending.
 */
export interface RoomSnapshot {
  roomCode: string;
  gameType: GameType;
  status: RoomStatus;
  hostPlayerId: string;
  players: PlayerSnapshot[];
  game: GameState;
  roundNumber: number;
  roundVersion: number;
  /** Players who agreed to start `nextGameType` as the next round. */
  rematchVotes: string[];
  nextGameType: GameType;
  draws: number;
  /** Monotonic counter; clients ignore snapshots older than the one they hold. */
  stateVersion: number;
  endReason: EndReason | null;
  expiresAt: string;
  createdAt: string;
  reconnectGraceSeconds: number;
}

export interface RoomPreview {
  roomCode: string;
  gameType: GameType;
  status: RoomStatus;
  hostName: string;
  playerCount: number;
  joinable: boolean;
  isMember: boolean;
}

export type MatchEndReason = 'NORMAL' | 'FORFEIT' | 'TIMEOUT';

export interface ChatMessage {
  id: string;
  playerId: string;
  displayName: string;
  text: string;
  sentAt: string;
}

export interface ReactionEvent {
  id: string;
  playerId: string;
  emoji: string;
}

/* ---- Server -> client notification payloads ---- */

export interface PlayerEventPayload {
  roomCode: string;
  playerId: string;
  displayName: string;
}

export interface PlayerStatusPayload extends PlayerEventPayload {
  connected: boolean;
}

export interface RoundCompletedPayload {
  roomCode: string;
  roundVersion: number;
  winnerPlayerId: string | null;
  isDraw: boolean;
  reason: MatchEndReason;
}

export interface RematchStatusPayload {
  roomCode: string;
  roundVersion: number;
  votes: string[];
  nextGameType: GameType;
  declinedBy: string | null;
}

export interface MoveRejectedPayload {
  code: ErrorCode;
  message: string;
  snapshot: RoomSnapshot | null;
}

export interface MoveResult {
  snapshot: RoomSnapshot;
}

export interface RoomClosedPayload {
  roomCode: string;
  reason: EndReason;
}
