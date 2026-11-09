import { END_REASONS, GAME_TYPES, MARKS, ROOM_STATUSES } from '@arena/shared';
import { Schema, model } from 'mongoose';
import type { RoomRecord } from '../services/rooms/types';

const roomPlayerSchema = new Schema(
  {
    playerId: { type: String, required: true },
    displayName: { type: String, required: true, maxlength: 20 },
    mark: { type: String, enum: MARKS, required: true },
    connected: { type: Boolean, default: false },
    joinedAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    disconnectedAt: { type: Date, default: null },
    wins: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const gameRoomSchema = new Schema<RoomRecord>(
  {
    roomCode: { type: String, required: true, minlength: 6, maxlength: 6 },
    gameType: { type: String, enum: GAME_TYPES, required: true },
    hostPlayerId: { type: String, required: true },
    players: {
      type: [roomPlayerSchema],
      validate: { validator: (v: unknown[]) => v.length <= 2, message: 'A room has two slots' },
    },
    status: { type: String, enum: ROOM_STATUSES, required: true },
    // The game state is produced and validated exclusively by the pure engine.
    game: { type: Schema.Types.Mixed, required: true },
    roundNumber: { type: Number, default: 1 },
    roundVersion: { type: Number, default: 1 },
    rematchVotes: { type: [String], default: [] },
    nextGameType: { type: String, enum: GAME_TYPES, required: true },
    draws: { type: Number, default: 0 },
    recentMoveIds: { type: [String], default: [] },
    stateVersion: { type: Number, default: 1 },
    endReason: { type: String, enum: [...END_REASONS, null], default: null },
    lastActivityAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    purgeAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false },
);

// Room codes are unique across all stored rooms; ended rooms are purged after retention.
gameRoomSchema.index({ roomCode: 1 }, { unique: true });
// Sweeper query: active rooms by expiry.
gameRoomSchema.index({ status: 1, expiresAt: 1 });
// "My waiting rooms" and membership lookups.
gameRoomSchema.index({ 'players.playerId': 1, status: 1 });
gameRoomSchema.index({ 'players.disconnectedAt': 1 }, { sparse: true });
// Automatic deletion of ended rooms.
gameRoomSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export const GameRoom = model<RoomRecord>('GameRoom', gameRoomSchema);
