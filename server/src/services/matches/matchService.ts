import { MatchResult } from '../../models/MatchResult';
import { isDuplicateKeyError } from '../../utils/AppError';
import type { RoundOutcome } from '../rooms/roomDomain';
import type { RoomRecord } from '../rooms/types';

/** Persists a completed round. Idempotent per (room, roundVersion). */
export async function recordMatchResult(
  room: RoomRecord,
  outcome: RoundOutcome,
  completedAt: Date,
): Promise<void> {
  try {
    await MatchResult.create({
      roomId: room._id,
      roomCode: room.roomCode,
      gameType: room.gameType,
      roundNumber: room.roundNumber,
      roundVersion: room.roundVersion,
      players: room.players.map((p) => ({
        playerId: p.playerId,
        displayName: p.displayName,
        mark: p.mark,
      })),
      winnerPlayerId: outcome.winnerPlayerId,
      result: outcome.isDraw ? 'DRAW' : 'WIN',
      reason: outcome.reason,
      moveCount: room.game.moveCount,
      completedAt,
    });
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
  }
}
