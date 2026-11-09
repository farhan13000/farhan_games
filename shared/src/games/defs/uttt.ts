import type { Mark } from '../../constants';
import { getWinner, isBoardFull } from '../grid';
import type { Cell, UtttExt } from '../types';
import { OK, baseState, fail, other, type GameDef } from './base';

/**
 * Ultimate Tic-Tac-Toe. Board index = smallBoard * 9 + cell, so cells of one
 * small board are contiguous. Sending rule: the cell you play picks the next board.
 */
export const utttDef: GameDef = {
  create: () => {
    const ext: UtttExt = {
      kind: 'uttt',
      macro: Array(9).fill(null),
      forced: null,
      macroLine: null,
    };
    return { ...baseState('ultimate-tic-tac-toe'), board: Array(81).fill(null), ext };
  },
  inputRange: () => 81,
  validate: (s, i) => {
    const ext = s.ext as UtttExt;
    const b = Math.floor(i / 9);
    if (s.board[i] !== null) return fail('CELL_OCCUPIED', 'That cell is already taken.');
    if (ext.macro[b] !== null) return fail('ILLEGAL_MOVE', 'That small board is already decided.');
    if (ext.forced !== null && ext.forced !== b) {
      return fail('ILLEGAL_MOVE', 'You must play in the highlighted board.');
    }
    return OK;
  },
  apply: (s, i, mark: Mark) => {
    const ext = s.ext as UtttExt;
    const b = Math.floor(i / 9);
    const cell = i % 9;
    const board = s.board.slice();
    board[i] = mark;

    const macro = ext.macro.slice();
    const small = board.slice(b * 9, b * 9 + 9);
    if (getWinner(small)) macro[b] = mark;
    else if (isBoardFull(small)) macro[b] = 'D';

    const big = getWinner(macro.map((m): Cell => (m === 'D' ? null : m)));
    const allDecided = macro.every((m) => m !== null);
    const finished = Boolean(big) || allDecided;
    return {
      ...s,
      board,
      ext: {
        kind: 'uttt',
        macro,
        forced: finished || macro[cell] !== null ? null : cell,
        macroLine: big?.line ?? null,
      },
      moveCount: s.moveCount + 1,
      step: s.step + 1,
      lastMove: { index: i, cell: i, mark, completedBoxes: [] },
      currentTurn: finished ? s.currentTurn : other(mark),
      status: finished ? 'COMPLETED' : 'IN_PROGRESS',
      winner: big?.winner ?? null,
      isDraw: !big && allDecided,
      scores: {
        X: macro.filter((m) => m === 'X').length,
        O: macro.filter((m) => m === 'O').length,
      },
    };
  },
};
