import { describe, expect, it } from 'vitest';
import {
  addPlayer,
  applyPlayerMove,
  createRoomRecord,
  evaluateTimeouts,
  leaveRoom,
  setConnection,
  toSnapshot,
  voteNextGame,
} from '../../src/services/rooms/roomDomain';
import type { GameType } from '@arena/shared';
import type { PlayerIdentity, RoomPolicy, RoomRecord } from '../../src/services/rooms/types';
import { AppError } from '../../src/utils/AppError';

const policy: RoomPolicy = {
  roomWaitingTtlMs: 30 * 60_000,
  roomIdleTtlMs: 60 * 60_000,
  reconnectGraceMs: 90_000,
  endedRoomRetentionMs: 7 * 86_400_000,
};

const host: PlayerIdentity = {
  sessionId: 's1',
  playerId: 'g:host',
  displayName: 'Host',
};
const guest: PlayerIdentity = {
  sessionId: 's2',
  playerId: 'g:guest',
  displayName: 'Guest',
};
const t0 = new Date('2026-01-01T12:00:00Z');
const at = (ms: number) => new Date(t0.getTime() + ms);

function readyRoom(): RoomRecord {
  const room = createRoomRecord({
    roomCode: 'ABC234',
    gameType: 'tic-tac-toe',
    host,
    now: t0,
    policy,
  });
  return addPlayer(room, guest, t0, policy).room;
}

let moveSeq = 0;
function play(room: RoomRecord, playerId: string, index: number, moveId = `m-${moveSeq++}-xyz`) {
  return applyPlayerMove(
    room,
    {
      playerId,
      index,
      moveId,
      roundVersion: room.roundVersion,
      expectedStep: room.game.step,
    },
    t0,
    policy,
  );
}

function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe(code);
    return;
  }
  throw new Error(`Expected ${code}`);
}

/** Plays X: 0,1,2 / O: 3,4 so the player holding X wins. */
function finishedRoom(): RoomRecord {
  let room = readyRoom();
  const x = room.players.find((p) => p.mark === 'X')!.playerId;
  const o = room.players.find((p) => p.mark === 'O')!.playerId;
  for (const [pid, idx] of [
    [x, 0],
    [o, 3],
    [x, 1],
    [o, 4],
    [x, 2],
  ] as const) {
    room = play(room, pid, idx).room;
  }
  return room;
}

describe('room lifecycle', () => {
  it('assigns X to the host, O to the second player and becomes READY', () => {
    const room = readyRoom();
    expect(room.status).toBe('READY');
    expect(room.players.map((p) => [p.playerId, p.mark])).toEqual([
      ['g:host', 'X'],
      ['g:guest', 'O'],
    ]);
  });

  it('rejects a third player and does not duplicate a rejoining member', () => {
    const room = readyRoom();
    const third: PlayerIdentity = { ...guest, playerId: 'g:third', sessionId: 's3' };
    expectCode(() => addPlayer(room, third, t0, policy), 'ROOM_FULL');
    const again = addPlayer(room, guest, t0, policy);
    expect(again.added).toBe(false);
    expect(again.room.players).toHaveLength(2);
  });

  it('moves to IN_PROGRESS after the first move and COMPLETED on a win', () => {
    const afterFirst = play(readyRoom(), 'g:host', 4).room;
    expect(afterFirst.status).toBe('IN_PROGRESS');
    const done = finishedRoom();
    expect(done.status).toBe('COMPLETED');
    expect(done.players.find((p) => p.playerId === 'g:host')!.wins).toBe(1);
  });
});

describe('move validation', () => {
  it('rejects moves from non-members and out-of-turn players', () => {
    const room = readyRoom();
    expectCode(() => play(room, 'g:stranger', 0), 'NOT_A_MEMBER');
    expectCode(() => play(room, 'g:guest', 0), 'NOT_YOUR_TURN');
  });

  it('rejects duplicate move IDs', () => {
    const room = play(readyRoom(), 'g:host', 0, 'dup-move-1').room;
    expectCode(() => play(room, 'g:guest', 1, 'dup-move-1'), 'DUPLICATE_MOVE');
  });

  it('rejects stale round versions and stale move counts', () => {
    const room = readyRoom();
    expectCode(
      () =>
        applyPlayerMove(
          room,
          {
            playerId: 'g:host',
            index: 0,
            moveId: 'stale-rv-1',
            roundVersion: 99,
            expectedStep: 0,
          },
          t0,
          policy,
        ),
      'STALE_ROUND',
    );
    expectCode(
      () =>
        applyPlayerMove(
          room,
          {
            playerId: 'g:host',
            index: 0,
            moveId: 'stale-mc-1',
            roundVersion: 1,
            expectedStep: 3,
          },
          t0,
          policy,
        ),
      'STALE_STATE',
    );
  });

  it('rejects moves after the round completed and in a waiting room', () => {
    expectCode(() => play(finishedRoom(), 'g:guest', 8), 'GAME_NOT_IN_PROGRESS');
    const waiting = createRoomRecord({
      roomCode: 'ABC234',
      gameType: 'tic-tac-toe',
      host,
      now: t0,
      policy,
    });
    expectCode(() => play(waiting, 'g:host', 0), 'GAME_NOT_IN_PROGRESS');
  });

  it('rejects occupied cells and invalid indices via the engine', () => {
    const room = play(readyRoom(), 'g:host', 0).room;
    expectCode(() => play(room, 'g:guest', 0), 'CELL_OCCUPIED');
    expectCode(() => play(room, 'g:guest', 9), 'INVALID_INDEX');
  });
});

describe('next game voting (rematch or switch)', () => {
  const vote = (room: RoomRecord, pid: string, accept = true, gameType?: GameType) =>
    voteNextGame(room, pid, room.roundVersion, accept, gameType, t0, policy);

  it('requires both votes, then resets the board and swaps marks', () => {
    const done = finishedRoom();
    const first = vote(done, 'g:guest');
    expect(first.started).toBe(false);
    expect(first.room.rematchVotes).toEqual(['g:guest']);
    expect(first.room.nextGameType).toBe('tic-tac-toe');
    // Voting twice is idempotent.
    expect(vote(first.room, 'g:guest').room.rematchVotes).toEqual(['g:guest']);

    const second = vote(first.room, 'g:host');
    expect(second.started).toBe(true);
    const next = second.room;
    expect(next.status).toBe('READY');
    expect(next.roundVersion).toBe(2);
    expect(next.roundNumber).toBe(2);
    expect(next.game.moveCount).toBe(0);
    expect(next.game.board.every((c) => c === null)).toBe(true);
    expect(next.players.find((p) => p.playerId === 'g:host')!.mark).toBe('O');
    expect(next.players.find((p) => p.playerId === 'g:guest')!.mark).toBe('X');
    expect(next.players.find((p) => p.playerId === 'g:host')!.wins).toBe(1); // series score kept
  });

  it('switches to a different game when both agree', () => {
    const proposed = vote(finishedRoom(), 'g:host', true, 'reversi');
    expect(proposed.room.nextGameType).toBe('reversi');
    const started = vote(proposed.room, 'g:guest');
    expect(started.started).toBe(true);
    expect(started.room.gameType).toBe('reversi');
    expect(started.room.game.gameType).toBe('reversi');
    expect(started.room.game.board.filter(Boolean)).toHaveLength(4);
  });

  it('a counter-proposal replaces the pending one', () => {
    const a = vote(finishedRoom(), 'g:host', true, 'hex');
    const b = vote(a.room, 'g:guest', true, 'mancala');
    expect(b.started).toBe(false);
    expect(b.room.nextGameType).toBe('mancala');
    expect(b.room.rematchVotes).toEqual(['g:guest']);
    expect(vote(b.room, 'g:host').room.gameType).toBe('mancala');
  });

  it('allows switching mid-round by mutual agreement without recording a result', () => {
    const inProgress = play(readyRoom(), 'g:host', 4).room;
    const a = vote(inProgress, 'g:host', true, 'rock-paper-scissors');
    const b = vote(a.room, 'g:guest');
    expect(b.room.gameType).toBe('rock-paper-scissors');
    expect(b.room.players.every((p) => p.wins === 0)).toBe(true);
    expect(b.room.draws).toBe(0);
  });

  it('lets the host change the game while waiting', () => {
    const waiting = createRoomRecord({
      roomCode: 'ABC234',
      gameType: 'tic-tac-toe',
      host,
      now: t0,
      policy,
    });
    const changed = vote(waiting, 'g:host', true, 'know-me');
    expect(changed.room.gameType).toBe('know-me');
    expect(changed.room.status).toBe('WAITING_FOR_PLAYER');
  });

  it('rejects stale votes', () => {
    const done = finishedRoom();
    expectCode(() => voteNextGame(done, 'g:host', 0, true, undefined, t0, policy), 'STALE_ROUND');
  });

  it('clears votes when a player declines', () => {
    const voted = vote(finishedRoom(), 'g:host').room;
    const declined = vote(voted, 'g:guest', false);
    expect(declined.declined).toBe(true);
    expect(declined.room.rematchVotes).toEqual([]);
  });
});

describe('hidden information', () => {
  it('never reveals the opponent’s secret pick in their snapshot', () => {
    const room = vote2(readyRoom(), 'rock-paper-scissors');
    const afterPick = play(room, 'g:host', 2).room;
    const guestView = toSnapshot(afterPick, policy, 'g:guest');
    const hostView = toSnapshot(afterPick, policy, 'g:host');
    // Marks swapped for round 2; the host sees their own pick, the guest only "locked in".
    const hostMark = afterPick.players.find((p) => p.playerId === 'g:host')!.mark;
    const guestMark = hostMark === 'X' ? 'O' : 'X';
    expect(
      (guestView.game.ext as { picks: Record<string, number | null> }).picks[guestMark],
    ).toBeNull();
    expect((hostView.game.ext as { picks: Record<string, number> }).picks[hostMark]).toBe(2);
    expect((guestView.game.ext as { picks: Record<string, number> }).picks[hostMark]).toBe(-1);
  });
});

function vote2(room: RoomRecord, gameType: GameType): RoomRecord {
  const a = voteNextGame(room, 'g:host', room.roundVersion, true, gameType, t0, policy);
  return voteNextGame(a.room, 'g:guest', room.roundVersion, true, undefined, t0, policy).room;
}

describe('leaving and timeouts', () => {
  it('closes a waiting room when the host leaves', () => {
    const waiting = createRoomRecord({
      roomCode: 'ABC234',
      gameType: 'tic-tac-toe',
      host,
      now: t0,
      policy,
    });
    const { room } = leaveRoom(waiting, 'g:host', t0, policy);
    expect(room.status).toBe('CANCELLED');
    expect(room.endReason).toBe('HOST_CLOSED');
    expect(room.purgeAt).not.toBeNull();
  });

  it('forfeits an in-progress round to the opponent when a player leaves', () => {
    const room = play(readyRoom(), 'g:host', 0).room;
    const res = leaveRoom(room, 'g:host', t0, policy);
    expect(res.outcome).toEqual({ winnerPlayerId: 'g:guest', isDraw: false, reason: 'FORFEIT' });
    expect(res.room.status).toBe('CANCELLED');
  });

  it('keeps a disconnected player within the grace period, then awards a timeout win', () => {
    let room = play(readyRoom(), 'g:host', 0).room;
    room = setConnection(room, 'g:guest', false, t0).room;
    expect(evaluateTimeouts(room, at(policy.reconnectGraceMs - 1000), policy)).toBeNull();
    const res = evaluateTimeouts(room, at(policy.reconnectGraceMs + 1000), policy)!;
    expect(res.outcome).toMatchObject({ winnerPlayerId: 'g:host', reason: 'TIMEOUT' });
    expect(res.room.endReason).toBe('PLAYER_TIMEOUT');
  });

  it('expires rooms when both players are gone or the TTL elapsed', () => {
    let room = readyRoom();
    room = setConnection(room, 'g:host', false, t0).room;
    room = setConnection(room, 'g:guest', false, t0).room;
    expect(evaluateTimeouts(room, at(policy.reconnectGraceMs + 1), policy)!.room.status).toBe(
      'EXPIRED',
    );

    const waiting = createRoomRecord({
      roomCode: 'ABC234',
      gameType: 'tic-tac-toe',
      host,
      now: t0,
      policy,
    });
    expect(evaluateTimeouts(waiting, at(policy.roomWaitingTtlMs - 1), policy)).toBeNull();
    expect(evaluateTimeouts(waiting, at(policy.roomWaitingTtlMs), policy)!.room.status).toBe(
      'EXPIRED',
    );
  });
});

describe('toSnapshot', () => {
  it('exposes only safe fields', () => {
    const snap = toSnapshot(readyRoom(), policy, 'g:host');
    expect(Object.keys(snap)).not.toContain('recentMoveIds');
    expect(snap.players[0]).not.toHaveProperty('userId');
    expect(snap.reconnectGraceSeconds).toBe(90);
  });
});
