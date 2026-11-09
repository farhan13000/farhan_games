import { randomInt } from 'node:crypto';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@arena/shared';
import { AppError, isDuplicateKeyError } from '../../utils/AppError';

export type CodeGenerator = () => string;

/** Generates a room code using a CSPRNG over a readable, unambiguous alphabet. */
export const generateRoomCode: CodeGenerator = () => {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
  }
  return code;
};

/**
 * Runs `attempt` with fresh codes until it succeeds without a duplicate-key error on
 * `roomCode`. The unique index is the source of truth, so this is race-free.
 */
export async function withUniqueRoomCode<T>(
  attempt: (code: string) => Promise<T>,
  generate: CodeGenerator = generateRoomCode,
  maxAttempts = 8,
): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await attempt(generate());
    } catch (err) {
      if (!isDuplicateKeyError(err, 'roomCode')) throw err;
    }
  }
  throw new AppError('INTERNAL_ERROR', 'Could not allocate a room code. Please try again.');
}
