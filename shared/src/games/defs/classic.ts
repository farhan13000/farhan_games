import type { Mark } from '../../constants';
import { boxEdges, boxesForLine, lineCount } from '../dots';
import { getDropCell, getNextTurn, getWinner, isBoardFull } from '../grid';
import type { GameState, GameType } from '../types';
import { OK, baseState, byScore, fail, type GameDef } from './base';

/** Free placement: Tic-Tac-Toe and Five in a Row. */
export function gridDef(gameType: GameType): GameDef {
  return {
    create: () => {
      const s = baseState(gameType);
      return { ...s, board: Array(s.rows * s.cols).fill(null) };
    },
    inputRange: (s) => s.board.length,
    validate: (s, i) =>
      s.board[i] !== null ? fail('CELL_OCCUPIED', 'That cell is already taken.') : OK,
    apply: (s, i, mark) => placeAndResolve(s, i, i, mark),
  };
}

/** Gravity: Four in a Row. The index is a column. */
export const dropDef: GameDef = {
  create: () => {
    const s = baseState('four-in-a-row');
    return { ...s, board: Array(s.rows * s.cols).fill(null) };
  },
  inputRange: (s) => s.cols,
  validate: (s, col) =>
    getDropCell(s.board, s.rows, s.cols, col) === -1
      ? fail('CELL_OCCUPIED', 'That column is full.')
      : OK,
  apply: (s, col, mark) => placeAndResolve(s, col, getDropCell(s.board, s.rows, s.cols, col), mark),
};

function placeAndResolve(s: GameState, index: number, cell: number, mark: Mark): GameState {
  const board = s.board.slice();
  board[cell] = mark;
  // 1. update board  2. check winner  3. check draw  4. otherwise switch turn
  const win = getWinner(board, s.rows, s.cols, s.winLength);
  const full = !win && isBoardFull(board);
  const done = Boolean(win) || full;
  return {
    ...s,
    board,
    moveCount: s.moveCount + 1,
    step: s.step + 1,
    lastMove: { index, cell, mark, completedBoxes: [] },
    winner: win?.winner ?? null,
    winningLine: win?.line ?? null,
    isDraw: full,
    status: done ? 'COMPLETED' : 'IN_PROGRESS',
    currentTurn: done ? s.currentTurn : getNextTurn(mark),
  };
}

/** Dots & Boxes. The index is a line; completing a box earns another turn. */
export const dotsDef: GameDef = {
  create: () => {
    const s = baseState('dots-and-boxes');
    return {
      ...s,
      board: Array(lineCount(s.rows, s.cols)).fill(null),
      boxes: Array(s.rows * s.cols).fill(null),
    };
  },
  inputRange: (s) => s.board.length,
  validate: (s, i) =>
    s.board[i] !== null ? fail('CELL_OCCUPIED', 'That line is already drawn.') : OK,
  apply: (s, line, mark) => {
    const board = s.board.slice();
    const boxes = s.boxes.slice();
    board[line] = mark;
    const completedBoxes: number[] = [];
    for (const box of boxesForLine(line, s.rows, s.cols)) {
      const r = Math.floor(box / s.cols);
      const c = box % s.cols;
      if (boxEdges(r, c, s.rows, s.cols).every((edge) => board[edge] !== null)) {
        boxes[box] = mark;
        completedBoxes.push(box);
      }
    }
    const scores = { ...s.scores, [mark]: s.scores[mark] + completedBoxes.length };
    const finished = isBoardFull(board);
    const result = finished ? byScore(scores) : { winner: null, isDraw: false };
    return {
      ...s,
      board,
      boxes,
      scores,
      moveCount: s.moveCount + 1,
      step: s.step + 1,
      lastMove: { index: line, cell: line, mark, completedBoxes },
      winner: result.winner,
      isDraw: result.isDraw,
      winningLine: result.winner ? boxes.flatMap((o, i) => (o === result.winner ? [i] : [])) : null,
      status: finished ? 'COMPLETED' : 'IN_PROGRESS',
      currentTurn: finished || completedBoxes.length > 0 ? mark : getNextTurn(mark),
    };
  },
};
