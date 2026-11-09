import { describe, expect, it } from 'vitest';
import { IN_SYNC_QUESTIONS, KNOW_ME_QUESTIONS } from './content';
import { pitOf, storeOf } from './defs/mancala';
import { reversiLegalMoves } from './defs/reversi';
import { hexWinningPath } from './defs/hex';
import { applyMove, canAct, createInitialGameState, redactGameState, validateMove } from './engine';
import {
  GAME_TYPES,
  HIDDEN_CHOICE,
  type GameState,
  type MancalaExt,
  type MemoryExt,
  type QuizExt,
  type RpsExt,
  type UtttExt,
} from './types';

const seeded = (seed = 42) => {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
};

describe('every game', () => {
  it.each(GAME_TYPES)('%s starts in progress with step 0 and a legal first move', (type) => {
    const s = createInitialGameState(type, seeded());
    expect(s.status).toBe('IN_PROGRESS');
    expect(s.step).toBe(0);
    expect(canAct(s, 'X')).toBe(true);
    // Some first move must be legal for X.
    const legal = Array.from({ length: 200 }, (_, i) => i).some((i) => validateMove(s, i, 'X').ok);
    expect(legal).toBe(true);
  });
});

describe('reversi', () => {
  it('starts with 4 discs and 4 legal moves for X', () => {
    const s = createInitialGameState('reversi');
    expect(s.scores).toEqual({ X: 2, O: 2 });
    expect(reversiLegalMoves(s.board, 8, 'X')).toHaveLength(4);
  });

  it('flips sandwiched discs and rejects moves that flip nothing', () => {
    const s = createInitialGameState('reversi');
    expect(validateMove(s, 0, 'X')).toMatchObject({ ok: false, code: 'ILLEGAL_MOVE' });
    const legal = reversiLegalMoves(s.board, 8, 'X')[0]!;
    const next = applyMove(s, legal, 'X');
    expect(next.scores).toEqual({ X: 4, O: 1 });
    expect(next.currentTurn).toBe('O');
  });

  it('plays to completion without errors', () => {
    let s = createInitialGameState('reversi');
    let guard = 0;
    while (s.status === 'IN_PROGRESS' && guard++ < 100) {
      s = applyMove(s, reversiLegalMoves(s.board, 8, s.currentTurn)[0]!, s.currentTurn);
    }
    expect(s.status).toBe('COMPLETED');
    expect(s.isDraw || s.winner !== null).toBe(true);
  });
});

describe('ultimate tic-tac-toe', () => {
  it('sends the next player to the board matching the cell played', () => {
    let s = createInitialGameState('ultimate-tic-tac-toe');
    s = applyMove(s, 4 * 9 + 2, 'X'); // centre board, cell 2
    expect((s.ext as UtttExt).forced).toBe(2);
    expect(validateMove(s, 0, 'O')).toMatchObject({ ok: false, code: 'ILLEGAL_MOVE' });
    expect(validateMove(s, 2 * 9 + 0, 'O').ok).toBe(true);
  });

  it('claims a small board and frees the player when sent to a decided board', () => {
    let s = createInitialGameState('ultimate-tic-tac-toe');
    // X wins board 0 (cells 0,1,2); O replies in board 0 each time.
    for (const [mark, idx] of [
      ['X', 0 * 9 + 4],
      ['O', 4 * 9 + 0],
      ['X', 0 * 9 + 3],
      ['O', 3 * 9 + 0],
      ['X', 0 * 9 + 5],
    ] as const) {
      s = applyMove(s, idx, mark);
    }
    const ext = s.ext as UtttExt;
    expect(ext.macro[0]).toBe('X');
    expect(ext.forced).toBe(5);
    expect(s.scores.X).toBe(1);
  });
});

describe('mancala', () => {
  it('gives an extra turn when the last seed lands in the store', () => {
    const s = applyMove(createInitialGameState('mancala'), 2, 'X'); // 4 seeds from pit 2 -> 3,4,5,store
    const ext = s.ext as MancalaExt;
    expect(ext.pits[storeOf('X')]).toBe(1);
    expect(ext.extraTurn).toBe(true);
    expect(s.currentTurn).toBe('X');
  });

  it('switches turn otherwise and rejects empty pits', () => {
    const s = applyMove(createInitialGameState('mancala'), 0, 'X');
    expect(s.currentTurn).toBe('O');
    expect((s.ext as MancalaExt).pits[pitOf('X', 0)]).toBe(0);
    const back = applyMove(s, 0, 'O');
    expect(validateMove(back, 0, 'X')).toMatchObject({ ok: false, code: 'ILLEGAL_MOVE' });
  });

  it('conserves all 48 seeds through a full game', () => {
    let s = createInitialGameState('mancala');
    let guard = 0;
    while (s.status === 'IN_PROGRESS' && guard++ < 500) {
      const i = [0, 1, 2, 3, 4, 5].find((k) => validateMove(s, k, s.currentTurn).ok)!;
      s = applyMove(s, i, s.currentTurn);
      expect((s.ext as MancalaExt).pits.reduce((a, b) => a + b, 0)).toBe(48);
    }
    expect(s.status).toBe('COMPLETED');
    expect(s.scores.X + s.scores.O).toBe(48);
  });
});

describe('hex', () => {
  it('detects a top-to-bottom chain for X', () => {
    const board = Array(81).fill(null);
    for (let r = 0; r < 9; r++) board[r * 9 + 3] = 'X';
    expect(hexWinningPath(board, 9, 'X')).toHaveLength(9);
    expect(hexWinningPath(board, 9, 'O')).toBeNull();
  });

  it('ends the game when a chain completes', () => {
    let s = createInitialGameState('hex');
    for (let r = 0; r < 9; r++) {
      s = applyMove(s, r * 9, 'X');
      if (s.status === 'IN_PROGRESS') s = applyMove(s, r * 9 + 8, 'O');
    }
    expect(s.winner).toBe('X');
    expect(s.winningLine).toHaveLength(9);
  });
});

describe('rock paper scissors (simultaneous, hidden)', () => {
  it('hides the opponent pick until both lock in', () => {
    let s = createInitialGameState('rock-paper-scissors');
    s = applyMove(s, 0, 'X');
    expect(canAct(s, 'X')).toBe(false);
    expect(canAct(s, 'O')).toBe(true);
    expect(validateMove(s, 1, 'X')).toMatchObject({ ok: false, code: 'NOT_YOUR_TURN' });
    expect((redactGameState(s, 'O').ext as RpsExt).picks.X).toBe(HIDDEN_CHOICE);
    expect((redactGameState(s, 'X').ext as RpsExt).picks.X).toBe(0);
    expect((redactGameState(s, null).ext as RpsExt).picks.X).toBe(HIDDEN_CHOICE);
    expect(s.step).toBe(0);
  });

  it('resolves a throw, scores it and reaches the target of 3', () => {
    let s = createInitialGameState('rock-paper-scissors');
    for (let i = 0; i < 3; i++) {
      s = applyMove(s, 1, 'X'); // paper
      s = applyMove(s, 0, 'O'); // rock
    }
    expect(s.step).toBe(3);
    expect(s.scores).toEqual({ X: 3, O: 0 });
    expect(s.status).toBe('COMPLETED');
    expect(s.winner).toBe('X');
  });

  it('does not score ties', () => {
    let s = createInitialGameState('rock-paper-scissors');
    s = applyMove(applyMove(s, 2, 'X'), 2, 'O');
    expect(s.scores).toEqual({ X: 0, O: 0 });
    expect((s.ext as RpsExt).history[0]).toEqual({ X: 2, O: 2, winner: null });
  });
});

describe('know-me & in-sync', () => {
  it('know-me: a correct guess scores for the guesser and the spotlight alternates', () => {
    let s = createInitialGameState('know-me', seeded());
    s = applyMove(s, 1, 'X'); // X answers about themself
    expect((redactGameState(s, 'O').ext as QuizExt).answers.X).toBe(HIDDEN_CHOICE);
    s = applyMove(s, 1, 'O'); // O guesses correctly
    expect(s.scores).toEqual({ X: 0, O: 1 });
    const ext = s.ext as QuizExt;
    expect(ext.history[0]).toMatchObject({ subject: 'X', match: true });
    expect(ext.q).toBe(1);
  });

  it('know-me: finishes after 10 questions with a winner or draw', () => {
    let s = createInitialGameState('know-me', seeded(7));
    for (let q = 0; q < 10; q++) {
      s = applyMove(s, 0, 'X');
      s = applyMove(s, q % 2 === 0 ? 0 : 1, 'O');
    }
    expect(s.status).toBe('COMPLETED');
    expect(s.scores.O).toBe(5);
    expect(s.winner).toBe('O');
  });

  it('in-sync: matches raise the shared score and the round ends as a co-op result', () => {
    let s = createInitialGameState('in-sync', seeded());
    for (let q = 0; q < 10; q++) {
      s = applyMove(s, 0, 'X');
      s = applyMove(s, q < 7 ? 0 : 1, 'O');
    }
    expect(s.scores).toEqual({ X: 7, O: 7 });
    expect(s.status).toBe('COMPLETED');
    expect(s.winner).toBeNull();
    expect(s.isDraw).toBe(true);
  });

  it('uses unique questions from the bank and validates option bounds', () => {
    const s = createInitialGameState('in-sync', seeded());
    const ext = s.ext as QuizExt;
    expect(new Set(ext.questions).size).toBe(10);
    expect(ext.questions.every((id) => id < IN_SYNC_QUESTIONS.length)).toBe(true);
    expect(validateMove(s, 2, 'X')).toMatchObject({ ok: false, code: 'INVALID_INDEX' });
    expect(KNOW_ME_QUESTIONS.length).toBeGreaterThanOrEqual(10);
  });
});

describe('memory match', () => {
  function findPair(s: GameState): [number, number] {
    const cards = (s.ext as MemoryExt).cards;
    const matched = (s.ext as MemoryExt).matched;
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        if (matched[i] === null && cards[i] === cards[j]) return [i, j];
      }
    }
    throw new Error('no pair');
  }

  it('deals 10 pairs and hides face-down cards from everyone', () => {
    const s = createInitialGameState('memory-match', seeded());
    const ext = s.ext as MemoryExt;
    expect(ext.cards).toHaveLength(20);
    expect(new Set(ext.cards).size).toBe(10);
    expect((redactGameState(s, 'X').ext as MemoryExt).cards.every((c) => c === '')).toBe(true);
  });

  it('a pair scores and keeps the turn; a miss reveals both then passes the turn', () => {
    let s = createInitialGameState('memory-match', seeded());
    const [a, b] = findPair(s);
    s = applyMove(s, a, 'X');
    expect((redactGameState(s, 'O').ext as MemoryExt).cards[a]).not.toBe('');
    s = applyMove(s, b, 'X');
    expect(s.scores.X).toBe(1);
    expect(s.currentTurn).toBe('X');
    expect(validateMove(s, a, 'X')).toMatchObject({ ok: false, code: 'CELL_OCCUPIED' });

    const cards = (s.ext as MemoryExt).cards;
    const first = cards.findIndex((_, i) => i !== a && i !== b);
    const miss = cards.findIndex((c, i) => i !== first && i !== a && i !== b && c !== cards[first]);
    s = applyMove(applyMove(s, first, 'X'), miss, 'X');
    expect(s.currentTurn).toBe('O');
    const seen = (redactGameState(s, 'O').ext as MemoryExt).cards;
    expect(seen[first]).not.toBe('');
    expect(seen[miss]).not.toBe('');
  });
});
