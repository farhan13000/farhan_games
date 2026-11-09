import type { Mark } from '../../constants';
import type { Cell, GameState, ReversiExt } from '../types';
import { OK, baseState, byScore, fail, other, type GameDef } from './base';

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

/** Opponent discs that placing `mark` at `index` would flip (empty if illegal). */
export function reversiFlips(
  board: readonly Cell[],
  size: number,
  index: number,
  mark: Mark,
): number[] {
  if (board[index] !== null) return [];
  const r0 = Math.floor(index / size);
  const c0 = index % size;
  const flips: number[] = [];
  for (const [dr, dc] of DIRS) {
    const line: number[] = [];
    let r = r0 + dr;
    let c = c0 + dc;
    while (r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === other(mark)) {
      line.push(r * size + c);
      r += dr;
      c += dc;
    }
    if (line.length && r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === mark) {
      flips.push(...line);
    }
  }
  return flips;
}

export function reversiLegalMoves(board: readonly Cell[], size: number, mark: Mark): number[] {
  const moves: number[] = [];
  for (let i = 0; i < board.length; i++)
    if (reversiFlips(board, size, i, mark).length) moves.push(i);
  return moves;
}

function count(board: readonly Cell[]): Record<Mark, number> {
  return {
    X: board.filter((c) => c === 'X').length,
    O: board.filter((c) => c === 'O').length,
  };
}

export const reversiDef: GameDef = {
  create: () => {
    const s = baseState('reversi');
    const n = s.cols;
    const board: Cell[] = Array(n * n).fill(null);
    const mid = n / 2;
    board[(mid - 1) * n + (mid - 1)] = 'O';
    board[mid * n + mid] = 'O';
    board[(mid - 1) * n + mid] = 'X';
    board[mid * n + (mid - 1)] = 'X';
    const ext: ReversiExt = { kind: 'reversi', flipped: [], passed: null };
    return { ...s, board, scores: count(board), ext };
  },
  inputRange: (s) => s.board.length,
  validate: (s, i, mark) => {
    if (s.board[i] !== null) return fail('CELL_OCCUPIED', 'That square is taken.');
    return reversiFlips(s.board, s.cols, i, mark).length
      ? OK
      : fail('ILLEGAL_MOVE', 'A move must flip at least one disc.');
  },
  apply: (s: GameState, i, mark) => {
    const n = s.cols;
    const flipped = reversiFlips(s.board, n, i, mark);
    const board = s.board.slice();
    board[i] = mark;
    for (const f of flipped) board[f] = mark;
    const scores = count(board);

    const opp = other(mark);
    const oppCanMove = reversiLegalMoves(board, n, opp).length > 0;
    const selfCanMove = !oppCanMove && reversiLegalMoves(board, n, mark).length > 0;
    const finished = !oppCanMove && !selfCanMove;
    const result = finished ? byScore(scores) : { winner: null, isDraw: false };
    const ext: ReversiExt = {
      kind: 'reversi',
      flipped,
      passed: !finished && !oppCanMove ? opp : null,
    };
    return {
      ...s,
      board,
      scores,
      ext,
      moveCount: s.moveCount + 1,
      step: s.step + 1,
      lastMove: { index: i, cell: i, mark, completedBoxes: [] },
      currentTurn: finished ? s.currentTurn : oppCanMove ? opp : mark,
      status: finished ? 'COMPLETED' : 'IN_PROGRESS',
      winner: result.winner,
      isDraw: result.isDraw,
    };
  },
};
