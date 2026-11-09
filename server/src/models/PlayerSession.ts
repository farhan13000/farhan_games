import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

/**
 * A browser's anonymous player session (no accounts). The raw session secret is
 * only ever held in an HttpOnly cookie; we store an HMAC-SHA256 hash of it.
 */
const playerSessionSchema = new Schema(
  {
    /** Public, non-secret identifier (UUID). Also the stable player identity. */
    sessionId: { type: String, required: true },
    tokenHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, maxlength: 20 },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    lastSeenAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

playerSessionSchema.index({ sessionId: 1 }, { unique: true });
// MongoDB removes expired sessions automatically.
playerSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PlayerSessionDoc = InferSchemaType<typeof playerSessionSchema> & {
  _id: Types.ObjectId;
};
export const PlayerSession = model('PlayerSession', playerSessionSchema);
