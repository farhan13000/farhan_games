import type { Mark } from '../../constants';
import type { Cell } from '../types';
import { OK, baseState, fail, other, type GameDef } from './base';

/** Neighbours on a rhombus-shaped hex board (axial coordinates). */
export function hexNeighbors(index: number, size: number): number[] {
  const r = Math.floor(index / size);
  const c = index % size;
  const out: number[] = [];
  for (const [dr, dc] of [
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
  ] as const) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) out.push(nr * size + nc);
  }
  return out;
}

/**
 * Returns the cells of a winning chain for `mark`, or null. X joins the top
 * and bottom rows; O joins the left and right columns.
 */
export function hexWinningPath(board: readonly Cell[], size: number, mark: Mark): number[] | null {
  const isStart = (i: number) => (mark === 'X' ? Math.floor(i / size) === 0 : i % size === 0);
  const isEnd = (i: number) =>
    mark === 'X' ? Math.floor(i / size) === size - 1 : i % size === size - 1;
  const parent = new Map<number, number>();
  const queue: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === mark && isStart(i)) {
      parent.set(i, -1);
      queue.push(i);
    }
  }
  while (queue.length) {
    const cur = queue.shift()!;
    if (isEnd(cur)) {
      const path: number[] = [];
      for (let p = cur; p !== -1; p = parent.get(p)!) path.push(p);
      return path.reverse();
    }
    for (const n of hexNeighbors(cur, size)) {
      if (board[n] === mark && !parent.has(n)) {
        parent.set(n, cur);
        queue.push(n);
      }
    }
  }
  return null;
}

export const hexDef: GameDef = {
  create: () => {
    const s = baseState('hex');
    return { ...s, board: Array(s.rows * s.cols).fill(null) };
  },
  inputRange: (s) => s.board.length,
  validate: (s, i) => (s.board[i] !== null ? fail('CELL_OCCUPIED', 'That hexagon is taken.') : OK),
  apply: (s, i, mark) => {
    const board = s.board.slice();
    board[i] = mark;
    const path = hexWinningPath(board, s.cols, mark);
    return {
      ...s,
      board,
      moveCount: s.moveCount + 1,
      step: s.step + 1,
      lastMove: { index: i, cell: i, mark, completedBoxes: [] },
      currentTurn: path ? s.currentTurn : other(mark),
      status: path ? 'COMPLETED' : 'IN_PROGRESS',
      winner: path ? mark : null,
      winningLine: path,
    };
  },
};
