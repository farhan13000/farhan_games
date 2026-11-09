import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { RoomSnapshot } from '@arena/shared';
import { GameRoom } from '../../src/models/GameRoom';
import { MatchResult } from '../../src/models/MatchResult';
import {
  connectClient,
  connectTestDb,
  createGuest,
  disconnectTestDb,
  expectOk,
  move,
  setupMatch,
  startTestServer,
  testConfig,
} from '../helpers';

type MoveAck = { snapshot: RoomSnapshot };

beforeAll(connectTestDb);
afterAll(disconnectTestDb);
// Sweeps count every room in the DB, so each test starts from an empty collection.
beforeEach(async () => {
  await GameRoom.deleteMany({});
});

/** A controllable clock shared by the server under test. */
function fakeClock() {
  let offset = 0;
  return { now: () => new Date(Date.now() + offset), advance: (ms: number) => (offset += ms) };
}

describe('room code collisions', () => {
  it('allocates a different code when the generated one is taken', async () => {
    const codes = ['QWERTY', 'QWERTY', 'ASDFGH'];
    const { server, url } = await startTestServer(testConfig(), {
      codeGenerator: () => codes.shift()!,
    });
    try {
      const a = await connectClient(url, (await createGuest(url, 'Coder One')).accessToken);
      const b = await connectClient(url, (await createGuest(url, 'Coder Two')).accessToken);
      const first = expectOk(await a.emit<MoveAck>('room:create', {}));
      const second = expectOk(await b.emit<MoveAck>('room:create', {}));
      expect(first.snapshot.roomCode).toBe('QWERTY');
      expect(second.snapshot.roomCode).toBe('ASDFGH');
      a.close();
      b.close();
    } finally {
      await server.stop();
    }
  });
});

describe('expiration and cleanup', () => {
  it('expires waiting rooms after the waiting TTL and blocks joins', async () => {
    const clock = fakeClock();
    const { server, url, config } = await startTestServer(testConfig(), { now: clock.now });
    try {
      const host = await connectClient(url, (await createGuest(url, 'Patient Pat')).accessToken);
      const { snapshot } = expectOk(await host.emit<MoveAck>('room:create', {}));
      expect(await server.roomService.sweep()).toBe(0);

      clock.advance(config.roomWaitingTtlMs + 1000);
      expect(await server.roomService.sweep()).toBe(1);
      const closed = await host.waitFor<{ reason: string }>('room:closed');
      expect(closed.reason).toBe('EXPIRED');

      const room = await GameRoom.findOne({ roomCode: snapshot.roomCode }).lean();
      expect(room?.status).toBe('EXPIRED');
      expect(room?.purgeAt).toBeInstanceOf(Date); // TTL index deletes it after retention

      const late = await connectClient(url, (await createGuest(url, 'Too Late')).accessToken);
      expect(await late.emit('room:join', { roomCode: snapshot.roomCode })).toMatchObject({
        ok: false,
        error: { code: 'ROOM_EXPIRED' },
      });
      host.close();
      late.close();
    } finally {
      await server.stop();
    }
  });

  it('awards a timeout win when a disconnected player misses the grace period', async () => {
    const clock = fakeClock();
    const { server, url, config } = await startTestServer(testConfig(), { now: clock.now });
    try {
      const { host, guest, roomCode, snapshot } = await setupMatch(url);
      expectOk(await host.emit('game:make-move', move(roomCode, snapshot, 4)));
      guest.close();
      await host.waitFor<{ connected: boolean }>('room:player-status', (p) => !p.connected);

      clock.advance(config.reconnectGraceMs / 2);
      expect(await server.roomService.sweep()).toBe(0); // still within grace

      clock.advance(config.reconnectGraceMs);
      expect(await server.roomService.sweep()).toBe(1);
      expect((await host.waitFor<{ reason: string }>('room:closed')).reason).toBe('PLAYER_TIMEOUT');
      expect(await MatchResult.findOne({ roomCode }).lean()).toMatchObject({
        reason: 'TIMEOUT',
        winnerPlayerId: snapshot.players[0]!.playerId,
      });
      host.close();
    } finally {
      await server.stop();
    }
  });
});

describe('server restart recovery', () => {
  it('restores a persisted in-progress game after a simulated restart', async () => {
    const config = testConfig();
    const first = await startTestServer(config);
    const { host, guest, hostAuth, guestAuth, roomCode, snapshot } = await setupMatch(first.url);
    let s = expectOk(
      await host.emit<MoveAck>('game:make-move', move(roomCode, snapshot, 0)),
    ).snapshot;
    s = expectOk(await guest.emit<MoveAck>('game:make-move', move(roomCode, s, 4))).snapshot;
    host.close();
    guest.close();
    await first.server.stop();

    // A brand-new server process against the same database.
    const second = await startTestServer(config);
    try {
      const stored = await GameRoom.findOne({ roomCode }).lean();
      expect(stored?.players.every((p) => !p.connected)).toBe(true);

      const host2 = await connectClient(second.url, hostAuth.accessToken);
      const guest2 = await connectClient(second.url, guestAuth.accessToken);
      const restoredHost = expectOk(
        await host2.emit<MoveAck>('session:reconnect', { roomCode }),
      ).snapshot;
      const restoredGuest = expectOk(
        await guest2.emit<MoveAck>('session:reconnect', { roomCode }),
      ).snapshot;
      expect(restoredHost.game.board).toEqual(s.game.board);
      expect(restoredGuest.game.moveCount).toBe(2);
      expect(restoredGuest.status).toBe('IN_PROGRESS');

      // Play continues where it left off.
      const next = expectOk(
        await host2.emit<MoveAck>('game:make-move', move(roomCode, restoredGuest, 8)),
      ).snapshot;
      expect(next.game.moveCount).toBe(3);
      host2.close();
      guest2.close();
    } finally {
      await second.server.stop();
    }
  });
});
