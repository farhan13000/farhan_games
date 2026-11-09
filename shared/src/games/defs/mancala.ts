import type { Mark } from '../../constants';
import type { MancalaExt } from '../types';
import { OK, baseState, byScore, fail, other, type GameDef } from './base';

export const MANCALA_SEEDS = 4;
export const storeOf = (mark: Mark) => (mark === 'X' ? 6 : 13);
/** Absolute pit index for a player's pit 0-5 (left to right from their side). */
export const pitOf = (mark: Mark, i: number) => (mark === 'X' ? i : 7 + i);

const sideEmpty = (pits: number[], mark: Mark) =>
  [0, 1, 2, 3, 4, 5].every((i) => pits[pitOf(mark, i)] === 0);

/** Kalah rules with 6 pits and 4 seeds per pit. The move index is the player's own pit (0-5). */
export const mancalaDef: GameDef = {
  create: () => {
    const pits = Array(14).fill(MANCALA_SEEDS);
    pits[6] = 0;
    pits[13] = 0;
    const ext: MancalaExt = { kind: 'mancala', pits, captured: [], extraTurn: false };
    return { ...baseState('mancala'), ext };
  },
  inputRange: () => 6,
  validate: (s, i, mark) =>
    (s.ext as MancalaExt).pits[pitOf(mark, i)] === 0
      ? fail('ILLEGAL_MOVE', 'That pit is empty.')
      : OK,
  apply: (s, i, mark) => {
    const pits = (s.ext as MancalaExt).pits.slice();
    const myStore = storeOf(mark);
    const oppStore = storeOf(other(mark));
    let pos = pitOf(mark, i);
    let seeds = pits[pos]!;
    pits[pos] = 0;
    while (seeds > 0) {
      pos = (pos + 1) % 14;
      if (pos === oppStore) continue;
      pits[pos]!++;
      seeds--;
    }

    const captured: number[] = [];
    const extraTurn = pos === myStore;
    const ownSide = mark === 'X' ? pos <= 5 : pos >= 7 && pos <= 12;
    const opposite = 12 - pos;
    if (!extraTurn && ownSide && pits[pos] === 1 && pits[opposite]! > 0) {
      pits[myStore]! += pits[opposite]! + 1;
      captured.push(pos, opposite);
      pits[pos] = 0;
      pits[opposite] = 0;
    }

    const finished = sideEmpty(pits, 'X') || sideEmpty(pits, 'O');
    if (finished) {
      // Remaining seeds go to the owner of that side.
      for (const m of ['X', 'O'] as const) {
        for (let k = 0; k < 6; k++) {
          pits[storeOf(m)]! += pits[pitOf(m, k)]!;
          pits[pitOf(m, k)] = 0;
        }
      }
    }
    const scores = { X: pits[6]!, O: pits[13]! };
    const result = finished ? byScore(scores) : { winner: null, isDraw: false };
    return {
      ...s,
      ext: { kind: 'mancala', pits, captured, extraTurn: extraTurn && !finished },
      scores,
      moveCount: s.moveCount + 1,
      step: s.step + 1,
      lastMove: { index: i, cell: pos, mark, completedBoxes: [] },
      currentTurn: finished ? s.currentTurn : extraTurn ? mark : other(mark),
      status: finished ? 'COMPLETED' : 'IN_PROGRESS',
      winner: result.winner,
      isDraw: result.isDraw,
    };
  },
};
