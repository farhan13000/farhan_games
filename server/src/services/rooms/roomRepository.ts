import { ACTIVE_ROOM_STATUSES } from '@arena/shared';
import { GameRoom } from '../../models/GameRoom';
import { AppError } from '../../utils/AppError';
import type { RoomRecord } from './types';

export async function findRoomByCode(roomCode: string): Promise<RoomRecord | null> {
  return GameRoom.findOne({ roomCode }).lean<RoomRecord>().exec();
}

export async function insertRoom(room: RoomRecord): Promise<RoomRecord> {
  await GameRoom.create(room);
  return room;
}

/**
 * Persists a new version of the room with an optimistic-concurrency check on
 * `stateVersion`, so a write based on stale data can never overwrite newer state.
 */
export async function saveRoom(room: RoomRecord, previousVersion: number): Promise<RoomRecord> {
  const { _id, createdAt: _c, updatedAt: _u, stateVersion: _s, ...fields } = room;
  const updated = await GameRoom.findOneAndUpdate(
    { _id, stateVersion: previousVersion },
    { $set: { ...fields, stateVersion: previousVersion + 1 } },
    { new: true },
  )
    .lean<RoomRecord>()
    .exec();
  if (!updated) throw new AppError('STATE_CONFLICT');
  return updated;
}

export async function findActiveRoomsHostedBy(playerId: string): Promise<RoomRecord[]> {
  return GameRoom.find({ hostPlayerId: playerId, status: 'WAITING_FOR_PLAYER' })
    .lean<RoomRecord[]>()
    .exec();
}

/** Rooms that may need a timeout/expiry decision at `now`. */
export async function findRoomsNeedingSweep(now: Date, graceMs: number): Promise<string[]> {
  const graceCutoff = new Date(now.getTime() - graceMs);
  const rooms = await GameRoom.find(
    {
      status: { $in: ACTIVE_ROOM_STATUSES },
      $or: [
        { expiresAt: { $lte: now } },
        { players: { $elemMatch: { connected: false, disconnectedAt: { $lte: graceCutoff } } } },
      ],
    },
    { roomCode: 1 },
  )
    .limit(500)
    .lean<Array<{ roomCode: string }>>()
    .exec();
  return rooms.map((r) => r.roomCode);
}

/**
 * After a restart no sockets exist, so every connected player is marked as
 * disconnected "now"; their reconnection grace period starts from boot.
 */
export async function markAllPlayersDisconnected(now: Date): Promise<number> {
  const res = await GameRoom.updateMany(
    { status: { $in: ACTIVE_ROOM_STATUSES }, 'players.connected': true },
    {
      $set: { 'players.$[p].connected': false, 'players.$[p].disconnectedAt': now },
      $inc: { stateVersion: 1 },
    },
    { arrayFilters: [{ 'p.connected': true }] },
  ).exec();
  return res.modifiedCount;
}
