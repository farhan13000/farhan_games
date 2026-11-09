import { z } from 'zod';
import { CHAT_MESSAGE_MAX_LENGTH, DISPLAY_NAME_MAX_LENGTH, REACTIONS } from './constants';
import { GAME_TYPES } from './games/types';
import { isValidRoomCode } from './roomCode';
import { DISPLAY_NAME_PATTERN, sanitizeText } from './sanitize';

/* ------------------------------ primitives ------------------------------ */

export const displayNameSchema = z
  .string({ required_error: 'Display name is required' })
  .transform(sanitizeText)
  .pipe(
    z
      .string()
      .min(2, 'Use at least 2 characters')
      .max(DISPLAY_NAME_MAX_LENGTH, `Use at most ${DISPLAY_NAME_MAX_LENGTH} characters`)
      .regex(DISPLAY_NAME_PATTERN, "Use letters, numbers, spaces and - _ . ' only"),
  );

export const roomCodeSchema = z
  .string()
  .transform((s) => s.replace(/[\s-]/g, '').toUpperCase())
  .refine(isValidRoomCode, 'Invalid room code');

const roundVersionSchema = z.number().int().min(1).max(1_000_000);

/** Client-generated idempotency key for a move. */
export const moveIdSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid move id');

/* --------------------------------- REST --------------------------------- */

export const guestSessionSchema = z.object({ displayName: displayNameSchema }).strict();

/* ------------------------------ Socket.IO ------------------------------- */

export const createRoomSchema = z
  .object({ gameType: z.enum(GAME_TYPES).default('tic-tac-toe') })
  .strict();

export const roomRefSchema = z.object({ roomCode: roomCodeSchema }).strict();

export const makeMoveSchema = z
  .object({
    roomCode: roomCodeSchema,
    roundVersion: roundVersionSchema,
    /** The game `step` the client saw when it chose the move (stale-state guard). */
    expectedStep: z.number().int().min(0).max(100_000),
    moveId: moveIdSchema,
    index: z.number().int().min(0).max(10_000),
  })
  .strict();

/** Proposes the next round: a rematch, or a different game when `gameType` is given. */
export const rematchRequestSchema = z
  .object({
    roomCode: roomCodeSchema,
    roundVersion: roundVersionSchema,
    gameType: z.enum(GAME_TYPES).optional(),
  })
  .strict();

export const rematchResponseSchema = z
  .object({ roomCode: roomCodeSchema, roundVersion: roundVersionSchema, accept: z.boolean() })
  .strict();

export const chatSendSchema = z
  .object({
    roomCode: roomCodeSchema,
    text: z
      .string()
      .transform(sanitizeText)
      .pipe(z.string().min(1, 'Message is empty').max(CHAT_MESSAGE_MAX_LENGTH)),
  })
  .strict();

export const reactionSchema = z
  .object({ roomCode: roomCodeSchema, emoji: z.enum(REACTIONS) })
  .strict();

export type GuestSessionInput = z.infer<typeof guestSessionSchema>;
export type CreateRoomInput = z.input<typeof createRoomSchema>;
export type RoomRefInput = z.input<typeof roomRefSchema>;
export type MakeMoveInput = z.input<typeof makeMoveSchema>;
export type RematchRequestInput = z.input<typeof rematchRequestSchema>;
export type RematchResponseInput = z.input<typeof rematchResponseSchema>;
export type ChatSendInput = z.input<typeof chatSendSchema>;
export type ReactionInput = z.input<typeof reactionSchema>;
