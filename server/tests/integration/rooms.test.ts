import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  MoveRejectedPayload,
  RoomPreview as PreviewRoom,
  RoomSnapshot,
  RoundCompletedPayload,
} from '@arena/shared';
import { GameMove } from '../../src/models/GameMove';
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
  type TestClient,
} from '../helpers';

let url: string;
let stop: () => Promise<void>;
const clients: TestClient[] = [];

beforeAll(async () => {
  await connectTestDb();
  const started = await startTestServer();
  url = started.url;
  stop = () => started.server.stop();
});

afterAll(async () => {
  clients.forEach((c) => c.close());
  await stop();
  await disconnectTestDb();
});

async function match(gameType?: Parameters<typeof setupMatch>[1]) {
  const m = await setupMatch(url, gameType);
  clients.push(m.host, m.guest);
  return m;
}

type MoveAck = { snapshot: RoomSnapshot };

describe('socket authentication', () => {
  it('rejects connections without a valid token', async () => {
    await expect(connectClient(url, 'not-a-token')).rejects.toThrow(/UNAUTHORIZED/);
  });
});

describe('room creation and joining', () => {
  it('creates a room and lets a second player join', async () => {
    const { host, roomCode, snapshot } = await match();
    expect(roomCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(snapshot.status).toBe('READY');
    expect(snapshot.players.map((p) => p.mark)).toEqual(['X', 'O']);
    const joined = await host.waitFor<{ displayName: string }>('room:player-joined');
    expect(joined.displayName).toBe('Guest Gus');
    const state = await host.waitFor<RoomSnapshot>('room:state', (s) => s.status === 'READY');
    expect(state.players).toHaveLength(2);
  });

  it('previews a room before joining', async () => {
    const auth = await createGuest(url, 'Preview Host');
    const hostClient = await connectClient(url, auth.accessToken);
    clients.push(hostClient);
    const { snapshot } = expectOk(
      await hostClient.emit<MoveAck>('room:create', { gameType: 'four-in-a-row' }),
    );
    const other = await connectClient(url, (await createGuest(url, 'Curious Cat')).accessToken);
    clients.push(other);
    const preview = expectOk(
      await other.emit<PreviewRoom>('room:preview', { roomCode: snapshot.roomCode }),
    );
    expect(preview).toMatchObject({
      gameType: 'four-in-a-row',
      hostName: 'Preview Host',
      joinable: true,
      isMember: false,
    });
  });

  it('rejects a third player', async () => {
    const { roomCode } = await match();
    const third = await connectClient(url, (await createGuest(url, 'Third Wheel')).accessToken);
    clients.push(third);
    const ack = await third.emit('room:join', { roomCode });
    expect(ack).toMatchObject({ ok: false, error: { code: 'ROOM_FULL' } });
  });

  it('rejects invalid and unknown room codes', async () => {
    const c = await connectClient(url, (await createGuest(url, 'Lost Lucy')).accessToken);
    clients.push(c);
    expect(await c.emit('room:join', { roomCode: '!!' })).toMatchObject({
      ok: false,
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(await c.emit('room:join', { roomCode: 'ZZZZZZ' })).toMatchObject({
      ok: false,
      error: { code: 'ROOM_NOT_FOUND' },
    });
  });

  it('does not create a duplicate slot when a member joins again', async () => {
    const { guest, roomCode } = await match();
    const again = expectOk(await guest.emit<MoveAck>('room:join', { roomCode }));
    expect(again.snapshot.players).toHaveLength(2);
  });

  it('lets the host close a waiting room', async () => {
    const auth = await createGuest(url, 'Closer');
    const c = await connectClient(url, auth.accessToken);
    clients.push(c);
    const { snapshot } = expectOk(await c.emit<MoveAck>('room:create', {}));
    expectOk(await c.emit('room:leave', { roomCode: snapshot.roomCode }));
    const room = await GameRoom.findOne({ roomCode: snapshot.roomCode }).lean();
    expect(room).toMatchObject({ status: 'CANCELLED', endReason: 'HOST_CLOSED' });
    const late = await connectClient(url, (await createGuest(url, 'Late Larry')).accessToken);
    clients.push(late);
    expect(await late.emit('room:join', { roomCode: snapshot.roomCode })).toMatchObject({
      ok: false,
      error: { code: 'ROOM_CLOSED' },
    });
  });
});

describe('gameplay', () => {
  it('broadcasts accepted moves to both players', async () => {
    const { host, guest, roomCode, snapshot } = await match();
    const res = expectOk(await host.emit<MoveAck>('game:make-move', move(roomCode, snapshot, 4)));
    expect(res.snapshot.game.board[4]).toBe('X');
    const seenByGuest = await guest.waitFor<RoomSnapshot>(
      'game:state',
      (s) => s.game.moveCount === 1,
    );
    const seenByHost = await host.waitFor<RoomSnapshot>(
      'game:state',
      (s) => s.game.moveCount === 1,
    );
    expect(seenByGuest.game.board).toEqual(seenByHost.game.board);
    expect(seenByGuest.status).toBe('IN_PROGRESS');
    expect(seenByGuest.game.currentTurn).toBe('O');
  });

  it('rejects unauthorized (non-member) moves', async () => {
    const { roomCode, snapshot } = await match();
    const outsider = await connectClient(url, (await createGuest(url, 'Sneaky Sam')).accessToken);
    clients.push(outsider);
    const ack = await outsider.emit('game:make-move', move(roomCode, snapshot, 0));
    expect(ack).toMatchObject({ ok: false, error: { code: 'NOT_A_MEMBER' } });
  });

  it('rejects out-of-turn moves and emits game:move-rejected with the latest snapshot', async () => {
    const { guest, roomCode, snapshot } = await match();
    const ack = await guest.emit('game:make-move', move(roomCode, snapshot, 0));
    expect(ack).toMatchObject({ ok: false, error: { code: 'NOT_YOUR_TURN' } });
    const rejected = await guest.waitFor<MoveRejectedPayload>('game:move-rejected');
    expect(rejected.code).toBe('NOT_YOUR_TURN');
    expect(rejected.snapshot?.roomCode).toBe(roomCode);
  });

  it('never trusts client-supplied extra fields such as a board', async () => {
    const { host, roomCode, snapshot } = await match();
    const ack = await host.emit('game:make-move', {
      ...move(roomCode, snapshot, 0),
      board: Array(9).fill('X'),
    });
    expect(ack).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
  });

  it('rejects duplicate and stale moves', async () => {
    const { host, guest, roomCode, snapshot } = await match();
    const first = move(roomCode, snapshot, 0, 'same-move-id-1');
    const after = expectOk(await host.emit<MoveAck>('game:make-move', first)).snapshot;
    expect(await host.emit('game:make-move', first)).toMatchObject({
      ok: false,
      error: { code: 'DUPLICATE_MOVE' },
    });
    // Guest submits based on the old snapshot (moveCount 0).
    expect(await guest.emit('game:make-move', move(roomCode, snapshot, 1))).toMatchObject({
      ok: false,
      error: { code: 'STALE_STATE' },
    });
    expect(
      await guest.emit('game:make-move', { ...move(roomCode, after, 1), roundVersion: 7 }),
    ).toMatchObject({ ok: false, error: { code: 'STALE_ROUND' } });
    expect(await GameMove.countDocuments({ roomCode })).toBe(1);
  });

  it('handles two nearly simultaneous moves safely', async () => {
    const { host, guest, roomCode, snapshot } = await match();
    const [a, b] = await Promise.all([
      host.emit('game:make-move', move(roomCode, snapshot, 0)),
      guest.emit('game:make-move', move(roomCode, snapshot, 1)),
    ]);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);
    const room = await GameRoom.findOne({ roomCode }).lean();
    expect(room?.game.moveCount).toBe(1);

    // Same player double-submitting the same cell with different IDs: exactly one wins.
    const latest = (a as { ok: true; data: MoveAck }).data.snapshot;
    const results = await Promise.all([
      guest.emit('game:make-move', move(roomCode, latest, 4)),
      guest.emit('game:make-move', move(roomCode, latest, 4)),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it('detects and persists a win', async () => {
    const { host, guest, roomCode, snapshot } = await match();
    let s = snapshot;
    for (const [client, idx] of [
      [host, 0],
      [guest, 3],
      [host, 1],
      [guest, 4],
      [host, 2],
    ] as const) {
      s = expectOk(await client.emit<MoveAck>('game:make-move', move(roomCode, s, idx))).snapshot;
    }
    expect(s.status).toBe('COMPLETED');
    expect(s.game.winner).toBe('X');
    expect(s.game.winningLine).toEqual([0, 1, 2]);
    const completed = await guest.waitFor<RoundCompletedPayload>('game:round-completed');
    expect(completed.winnerPlayerId).toBe(s.players[0]!.playerId);
    const result = await MatchResult.findOne({ roomCode }).lean();
    expect(result).toMatchObject({
      result: 'WIN',
      winnerPlayerId: s.players[0]!.playerId,
      moveCount: 5,
    });
  });

  it('detects and persists a draw', async () => {
    const { host, guest, roomCode, snapshot } = await match();
    let s = snapshot;
    const seq = [0, 1, 2, 4, 3, 5, 7, 6, 8];
    for (const [i, idx] of seq.entries()) {
      s = expectOk(
        await (i % 2 === 0 ? host : guest).emit<MoveAck>('game:make-move', move(roomCode, s, idx)),
      ).snapshot;
    }
    expect(s.game.isDraw).toBe(true);
    expect(s.draws).toBe(1);
    expect(await MatchResult.findOne({ roomCode }).lean()).toMatchObject({
      result: 'DRAW',
      winnerPlayerId: null,
    });
  });

  it('plays the other game types through the same pipeline', async () => {
    const four = await match('four-in-a-row');
    const res = expectOk(
      await four.host.emit<MoveAck>('game:make-move', move(four.roomCode, four.snapshot, 3)),
    );
    expect(res.snapshot.game.board[38]).toBe('X'); // bottom row, column 3

    const dots = await match('dots-and-boxes');
    const d = expectOk(
      await dots.host.emit<MoveAck>('game:make-move', move(dots.roomCode, dots.snapshot, 0)),
    );
    expect(d.snapshot.game.board[0]).toBe('X');
    expect(d.snapshot.game.currentTurn).toBe('O');
  });
});

describe('rematch', () => {
  it('requires both players and starts a fresh round with swapped marks', async () => {
    const { host, guest, roomCode, snapshot } = await match();
    let s = snapshot;
    for (const [client, idx] of [
      [host, 0],
      [guest, 3],
      [host, 1],
      [guest, 4],
      [host, 2],
    ] as const) {
      s = expectOk(await client.emit<MoveAck>('game:make-move', move(roomCode, s, idx))).snapshot;
    }
    expect(await guest.emit('game:rematch-request', { roomCode, roundVersion: 0 })).toMatchObject({
      ok: false,
    });
    const voted = expectOk(
      await guest.emit<MoveAck>('game:rematch-request', { roomCode, roundVersion: s.roundVersion }),
    );
    expect(voted.snapshot.rematchVotes).toEqual([s.players[1]!.playerId]);
    await host.waitFor('game:rematch-status', (p: { votes: string[] }) => p.votes.length === 1);

    const started = expectOk(
      await host.emit<MoveAck>('game:rematch-response', {
        roomCode,
        roundVersion: s.roundVersion,
        accept: true,
      }),
    ).snapshot;
    expect(started).toMatchObject({
      status: 'READY',
      roundNumber: 2,
      roundVersion: 2,
      rematchVotes: [],
    });
    expect(started.game.moveCount).toBe(0);
    expect(started.players.map((p) => p.mark)).toEqual(['O', 'X']);
    expect(started.players[0]!.wins).toBe(1);

    // A stale vote for round 1 is rejected now.
    expect(await guest.emit('game:rematch-request', { roomCode, roundVersion: 1 })).toMatchObject({
      ok: false,
      error: { code: 'STALE_ROUND' },
    });
    // The guest (now X) opens round two.
    const r2 = expectOk(
      await guest.emit<MoveAck>('game:make-move', move(roomCode, started, 4)),
    ).snapshot;
    expect(r2.game.board[4]).toBe('X');
  });
});

describe('presence and reconnection', () => {
  it('marks a player offline on disconnect and restores state on reconnect', async () => {
    const { host, guest, guestAuth, roomCode, snapshot } = await match();
    const s1 = expectOk(
      await host.emit<MoveAck>('game:make-move', move(roomCode, snapshot, 4)),
    ).snapshot;

    guest.close();
    const offline = await host.waitFor<{ connected: boolean }>(
      'room:player-status',
      (p) => !p.connected,
    );
    expect(offline.connected).toBe(false);

    const back = await connectClient(url, guestAuth.accessToken);
    clients.push(back);
    const restored = expectOk(
      await back.emit<{ snapshot: RoomSnapshot }>('session:reconnect', { roomCode }),
    );
    expect(restored.snapshot.game.board).toEqual(s1.game.board);
    expect(restored.snapshot.players).toHaveLength(2);
    expect(restored.snapshot.players.every((p) => p.connected)).toBe(true);
    await host.waitFor<{ connected: boolean }>('room:player-status', (p) => p.connected);

    // The reconnected guest can continue playing.
    expectOk(await back.emit('game:make-move', move(roomCode, restored.snapshot, 0)));
  });

  it('refuses session:reconnect for non-members', async () => {
    const { roomCode } = await match();
    const stranger = await connectClient(url, (await createGuest(url, 'Stranger')).accessToken);
    clients.push(stranger);
    expect(await stranger.emit('session:reconnect', { roomCode })).toMatchObject({
      ok: false,
      error: { code: 'NOT_A_MEMBER' },
    });
  });

  it('forfeits to the opponent when a player leaves mid-game', async () => {
    const { host, guest, roomCode, snapshot } = await match();
    expectOk(await host.emit('game:make-move', move(roomCode, snapshot, 0)));
    expectOk(await host.emit('room:leave', { roomCode }));
    const closed = await guest.waitFor<{ reason: string }>('room:closed');
    expect(closed.reason).toBe('PLAYER_LEFT');
    expect(await MatchResult.findOne({ roomCode }).lean()).toMatchObject({
      reason: 'FORFEIT',
      winnerPlayerId: snapshot.players[1]!.playerId,
    });
  });
});

describe('chat and reactions', () => {
  it('sanitizes and broadcasts chat to members only', async () => {
    const { host, guest, roomCode } = await match();
    const sent = expectOk(
      await host.emit<{ message: { text: string } }>('chat:send', {
        roomCode,
        text: '  gl\u0000  hf  ',
      }),
    );
    expect(sent.message.text).toBe('gl hf');
    expect((await guest.waitFor<{ text: string }>('chat:message')).text).toBe('gl hf');

    const outsider = await connectClient(
      url,
      (await createGuest(url, 'Eaves Dropper')).accessToken,
    );
    clients.push(outsider);
    expect(await outsider.emit('chat:send', { roomCode, text: 'hi' })).toMatchObject({
      ok: false,
      error: { code: 'NOT_A_MEMBER' },
    });
    expect(await host.emit('room:reaction', { roomCode, emoji: '🔥' })).toMatchObject({ ok: true });
    expect(await host.emit('room:reaction', { roomCode, emoji: 'nope' })).toMatchObject({
      ok: false,
    });
  });
});

describe('playing many games in one room', () => {
  it('switches games by mutual agreement and keeps the series score', async () => {
    const { host, guest, roomCode, snapshot } = await match();
    let s = snapshot;
    for (const [client, idx] of [
      [host, 0],
      [guest, 3],
      [host, 1],
      [guest, 4],
      [host, 2],
    ] as const) {
      s = expectOk(await client.emit<MoveAck>('game:make-move', move(roomCode, s, idx))).snapshot;
    }
    const proposed = expectOk(
      await guest.emit<MoveAck>('game:rematch-request', {
        roomCode,
        roundVersion: s.roundVersion,
        gameType: 'memory-match',
      }),
    ).snapshot;
    expect(proposed.nextGameType).toBe('memory-match');
    const status = await host.waitFor<{ nextGameType: string; votes: string[] }>(
      'game:rematch-status',
    );
    expect(status).toMatchObject({ nextGameType: 'memory-match' });

    const started = expectOk(
      await host.emit<MoveAck>('game:rematch-response', {
        roomCode,
        roundVersion: s.roundVersion,
        accept: true,
      }),
    ).snapshot;
    expect(started).toMatchObject({ gameType: 'memory-match', status: 'READY', roundNumber: 2 });
    expect(started.players[0]!.wins).toBe(1);
    // Face-down cards are never sent to clients.
    expect((started.game.ext as { cards: string[] }).cards.every((c) => c === '')).toBe(true);
  });

  it('never broadcasts an opponent’s secret pick', async () => {
    const { host, guest, roomCode, snapshot } = await match();
    const a = expectOk(
      await host.emit<MoveAck>('game:rematch-request', {
        roomCode,
        roundVersion: snapshot.roundVersion,
        gameType: 'rock-paper-scissors',
      }),
    ).snapshot;
    const rps = expectOk(
      await guest.emit<MoveAck>('game:rematch-response', {
        roomCode,
        roundVersion: a.roundVersion,
        accept: true,
      }),
    ).snapshot;
    // Marks swapped: the guest is X in round 2.
    const guestMark = rps.players.find((p) => p.displayName === 'Guest Gus')!.mark;
    const hostMark = guestMark === 'X' ? 'O' : 'X';

    const mine = expectOk(
      await guest.emit<MoveAck>('game:make-move', move(roomCode, rps, 1)),
    ).snapshot;
    expect((mine.game.ext as { picks: Record<string, number> }).picks[guestMark]).toBe(1);
    const seenByHost = await host.waitFor<RoomSnapshot>(
      'game:state',
      (s) => s.game.submitted[guestMark],
    );
    expect((seenByHost.game.ext as { picks: Record<string, number> }).picks[guestMark]).toBe(-1);
    expect(JSON.stringify(seenByHost)).not.toContain('"picks":{"X":1');

    const done = expectOk(
      await host.emit<MoveAck>('game:make-move', move(roomCode, rps, 0)),
    ).snapshot;
    const history = (done.game.ext as unknown as { history: Array<Record<string, number | null>> })
      .history;
    expect(history[0]).toMatchObject({ [guestMark]: 1, [hostMark]: 0, winner: guestMark });
  });
});
