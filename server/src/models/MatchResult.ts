import { GAME_TYPES, MARKS } from '@arena/shared';
import { Schema, model } from 'mongoose';

const matchPlayerSchema = new Schema(
  {
    playerId: { type: String, required: true },
    displayName: { type: String, required: true },
    mark: { type: String, enum: MARKS, required: true },
  },
  { _id: false },
);

/** One document per completed round (audit trail; there are no user accounts). */
const matchResultSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'GameRoom', required: true },
    roomCode: { type: String, required: true },
    gameType: { type: String, enum: GAME_TYPES, required: true },
    roundNumber: { type: Number, required: true },
    roundVersion: { type: Number, required: true },
    players: { type: [matchPlayerSchema], required: true },
    winnerPlayerId: { type: String, default: null },
    result: { type: String, enum: ['WIN', 'DRAW'], required: true },
    reason: { type: String, enum: ['NORMAL', 'FORFEIT', 'TIMEOUT'], default: 'NORMAL' },
    moveCount: { type: Number, required: true },
    completedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

matchResultSchema.index({ roomId: 1, roundVersion: 1 }, { unique: true });
// Results are only kept for 30 days.
matchResultSchema.index({ completedAt: 1 }, { expireAfterSeconds: 30 * 86_400 });

export const MatchResult = model('MatchResult', matchResultSchema);
