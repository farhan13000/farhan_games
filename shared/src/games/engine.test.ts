import { describe, expect, it } from 'vitest';
import type { Mark } from '../constants';
import { lineCount, boxEdges } from './dots';
import { applyMove, createInitialGameState, validateMove } from './engine';
import { getNextTurn, getWinner, isDraw } from './grid';
import type { Cell, GameState } from './types';

const _ = null;
const X: Mark = 'X';
const O: Mark = 'O';

/** Plays a sequence of indices, alternating marks according to the engine's turn. */
function play(state: GameState, moves: number[]): GameState {
  return moves.reduce((s, idx) => applyMove(s, idx, s.currentTurn), state);
}

describe('createInitialGameState', () => {
  it('creates an empty 3x3 tic-tac-toe board with X to move', () => {
    const s = createInitialGameState('tic-tac-toe');
    expect(s.board).toHaveLength(9);
    expect(s.board.every((c) => c === null)).toBe(true);
    expect(s.currentTurn).toBe('X');
    expect(s.status).toBe('IN_PROGRESS');
    expect(s.moveCount).toBe(0);
  });

  it('sizes boards for every game type', () => {
    expect(createInitialGameState('four-in-a-row').board).toHaveLength(42);
    expect(createInitialGameState('five-in-a-row').board).toHaveLength(169);
    const dots = createInitialGameState('dots-and-boxes');
    expect(dots.board).toHaveLength(lineCount(4, 4));
    expect(dots.boxes).toHaveLength(16);
  });
});

describe('getWinner (3x3)', () => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  it.each(lines)('detects winning line %j for both marks', (...line) => {
    for (const mark of [X, O]) {
      const board: Cell[] = Array(9).fill(null);
      line.forEach((i) => (board[i] = mark));
      const result = getWinner(board);
      expect(result?.winner).toBe(mark);
      expect([...(result?.line ?? [])].sort()).toEqual([...line].sort());
    }
  });

  it('returns null when there is no line', () => {
    expect(getWinner([X, O, X, X, O, O, O, X, X])).toBeNull();
    expect(getWinner(Array(9).fill(null))).toBeNull();
  });

  it('detects horizontal, vertical and diagonal wins on bigger boards', () => {
    const board: Cell[] = Array(169).fill(null);
    [20, 21, 22, 23, 24].forEach((i) => (board[i] = O));
    expect(getWinner(board, 13, 13, 5)?.winner).toBe(O);

    const vertical: Cell[] = Array(42).fill(null);
    [3, 10, 17, 24].forEach((i) => (vertical[i] = X));
    expect(getWinner(vertical, 6, 7, 4)?.line).toEqual([3, 10, 17, 24]);

    const anti: Cell[] = Array(42).fill(null);
    [6, 12, 18, 24].forEach((i) => (anti[i] = X));
    expect(getWinner(anti, 6, 7, 4)?.winner).toBe(X);
  });

  it('does not wrap lines across row edges', () => {
    const board: Cell[] = Array(42).fill(null);
    [5, 6, 7, 8].forEach((i) => (board[i] = X)); // spans rows 0 and 1
    expect(getWinner(board, 6, 7, 4)).toBeNull();
  });
});

describe('isDraw / getNextTurn', () => {
  it('detects a draw on a full board with no winner', () => {
    expect(isDraw([X, O, X, X, O, O, O, X, X])).toBe(true);
  });
  it('is not a draw when the board is full but has a winner', () => {
    expect(isDraw([X, X, X, O, O, X, X, O, O])).toBe(false);
  });
  it('is not a draw while cells remain', () => {
    expect(isDraw([X, O, _, _, _, _, _, _, _])).toBe(false);
  });
  it('alternates turns', () => {
    expect(getNextTurn('X')).toBe('O');
    expect(getNextTurn('O')).toBe('X');
  });
});

describe('validateMove / applyMove (tic-tac-toe)', () => {
  it('rejects out-of-bounds and non-integer indices', () => {
    const s = createInitialGameState();
    expect(validateMove(s, -1, X)).toMatchObject({ ok: false, code: 'INVALID_INDEX' });
    expect(validateMove(s, 9, X)).toMatchObject({ ok: false, code: 'INVALID_INDEX' });
    expect(validateMove(s, 1.5, X)).toMatchObject({ ok: false, code: 'INVALID_INDEX' });
  });

  it('rejects occupied cells', () => {
    const s = applyMove(createInitialGameState(), 4, X);
    expect(validateMove(s, 4, O)).toMatchObject({ ok: false, code: 'CELL_OCCUPIED' });
  });

  it('rejects the wrong player turn', () => {
    const s = createInitialGameState();
    expect(validateMove(s, 0, O)).toMatchObject({ ok: false, code: 'NOT_YOUR_TURN' });
    expect(() => applyMove(s, 0, O)).toThrow(/NOT_YOUR_TURN/);
  });

  it('applies a move immutably and switches turn', () => {
    const s = createInitialGameState();
    const next = applyMove(s, 0, X);
    expect(s.board[0]).toBeNull();
    expect(next.board[0]).toBe('X');
    expect(next.currentTurn).toBe('O');
    expect(next.moveCount).toBe(1);
    expect(next.lastMove).toMatchObject({ index: 0, cell: 0, mark: 'X' });
  });

  it('completes the game on a win and rejects further moves', () => {
    const s = play(createInitialGameState(), [0, 3, 1, 4, 2]);
    expect(s.status).toBe('COMPLETED');
    expect(s.winner).toBe('X');
    expect(s.winningLine).toEqual([0, 1, 2]);
    expect(validateMove(s, 8, 'O')).toMatchObject({ ok: false, code: 'GAME_NOT_IN_PROGRESS' });
  });

  it('completes the game as a draw', () => {
    // X O X / X O O / O X X
    const s = play(createInitialGameState(), [0, 1, 2, 4, 3, 5, 7, 6, 8]);
    expect(s.status).toBe('COMPLETED');
    expect(s.isDraw).toBe(true);
    expect(s.winner).toBeNull();
  });
});

describe('four-in-a-row', () => {
  it('drops discs to the lowest free slot', () => {
    let s = createInitialGameState('four-in-a-row');
    s = applyMove(s, 3, X);
    expect(s.lastMove?.cell).toBe(5 * 7 + 3);
    s = applyMove(s, 3, O);
    expect(s.lastMove?.cell).toBe(4 * 7 + 3);
  });

  it('rejects full columns and columns outside the board', () => {
    let s = createInitialGameState('four-in-a-row');
    s = play(s, [0, 0, 0, 0, 0, 0]);
    expect(validateMove(s, 0, s.currentTurn)).toMatchObject({ ok: false, code: 'CELL_OCCUPIED' });
    expect(validateMove(s, 7, s.currentTurn)).toMatchObject({ ok: false, code: 'INVALID_INDEX' });
  });

  it('detects a vertical connect four', () => {
    const s = play(createInitialGameState('four-in-a-row'), [2, 3, 2, 3, 2, 3, 2]);
    expect(s.winner).toBe('X');
    expect(s.status).toBe('COMPLETED');
  });
});

describe('five-in-a-row', () => {
  it('requires five in a row', () => {
    // X plays 0..4 on row 0, O plays on row 1.
    let s = play(createInitialGameState('five-in-a-row'), [0, 13, 1, 14, 2, 15, 3, 16]);
    expect(s.status).toBe('IN_PROGRESS');
    s = applyMove(s, 4, 'X');
    expect(s.winner).toBe('X');
    expect(s.winningLine).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('dots-and-boxes', () => {
  it('awards a box and an extra turn when the fourth side is drawn', () => {
    let s = createInitialGameState('dots-and-boxes');
    const [top, bottom, left, right] = boxEdges(0, 0, 4, 4);
    s = applyMove(s, top, X); // -> O
    s = applyMove(s, bottom, O); // -> X
    s = applyMove(s, left, X); // -> O
    s = applyMove(s, right, O); // O completes box 0
    expect(s.boxes[0]).toBe('O');
    expect(s.scores.O).toBe(1);
    expect(s.currentTurn).toBe('O');
    expect(s.lastMove?.completedBoxes).toEqual([0]);
  });

  it('rejects drawing an existing line', () => {
    const s = applyMove(createInitialGameState('dots-and-boxes'), 0, X);
    expect(validateMove(s, 0, O)).toMatchObject({ ok: false, code: 'CELL_OCCUPIED' });
  });

  it('ends when every line is drawn and picks the higher score', () => {
    let s = createInitialGameState('dots-and-boxes');
    for (let i = 0; i < s.board.length; i++) s = applyMove(s, i, s.currentTurn);
    expect(s.status).toBe('COMPLETED');
    expect(s.scores.X + s.scores.O).toBe(16);
    if (s.scores.X === s.scores.O) expect(s.isDraw).toBe(true);
    else expect(s.winner).toBe(s.scores.X > s.scores.O ? 'X' : 'O');
  });
});
