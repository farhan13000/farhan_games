import { MARKS } from '@arena/shared';
import { Schema, model } from 'mongoose';

/** Append-only move log for audit/replay. Unique indexes are a second line of dedupe defence. */
const gameMoveSchema = new Schema(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'GameRoom', required: true },
    roomCode: { type: String, required: true },
    roundVersion: { type: Number, required: true },
    moveNumber: { type: Number, required: true },
    playerId: { type: String, required: true },
    mark: { type: String, enum: MARKS, required: true },
    index: { type: Number, required: true },
    cell: { type: Number, required: true },
    moveId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

gameMoveSchema.index({ roomId: 1, roundVersion: 1, moveNumber: 1 }, { unique: true });
gameMoveSchema.index({ roomId: 1, roundVersion: 1, moveId: 1 }, { unique: true });
// Keep the audit log for 30 days.
gameMoveSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 86_400 });

export const GameMove = model('GameMove', gameMoveSchema);
