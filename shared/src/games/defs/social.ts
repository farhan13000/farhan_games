import type { Mark } from '../../constants';
import {
  IN_SYNC_QUESTIONS,
  KNOW_ME_QUESTIONS,
  MEMORY_FACES,
  QUIZ_QUESTIONS_PER_ROUND,
  RPS_CHOICES,
} from '../content';
import {
  HIDDEN_CHOICE,
  type Cell,
  type GameState,
  type MemoryExt,
  type QuizExt,
  type RpsExt,
} from '../types';
import { OK, baseState, byScore, fail, other, shuffle, type GameDef } from './base';

/** Hides the opponent's locked-in choice from `viewer` (and both from non-players). */
function hideChoices(
  choices: Record<Mark, number | null>,
  viewer: Mark | null,
): Record<Mark, number | null> {
  const hide = (m: Mark) => (choices[m] !== null && m !== viewer ? HIDDEN_CHOICE : choices[m]);
  return { X: hide('X'), O: hide('O') };
}

const lockIn = (s: GameState, mark: Mark): GameState => ({
  ...s,
  submitted: { ...s.submitted, [mark]: true },
  moveCount: s.moveCount + 1,
});

/* ----------------------------- rock paper scissors ----------------------------- */

export const RPS_TARGET = 3;

/** 1 if `a` beats `b`, -1 if it loses, 0 on a tie. */
export function rpsCompare(a: number, b: number): 1 | 0 | -1 {
  if (a === b) return 0;
  return (a - b + 3) % 3 === 1 ? 1 : -1;
}

export const rpsDef: GameDef = {
  create: () => {
    const ext: RpsExt = {
      kind: 'rps',
      target: RPS_TARGET,
      picks: { X: null, O: null },
      history: [],
    };
    return { ...baseState('rock-paper-scissors'), turnMode: 'simultaneous', ext };
  },
  inputRange: () => RPS_CHOICES.length,
  validate: () => OK,
  apply: (s, choice, mark) => {
    const ext = s.ext as RpsExt;
    const picks = { ...ext.picks, [mark]: choice };
    const next = lockIn(s, mark);
    if (picks.X === null || picks.O === null) return { ...next, ext: { ...ext, picks } };

    const cmp = rpsCompare(picks.X, picks.O);
    const winner: Mark | null = cmp === 1 ? 'X' : cmp === -1 ? 'O' : null;
    const scores = winner ? { ...s.scores, [winner]: s.scores[winner] + 1 } : s.scores;
    const matchWinner = scores.X >= ext.target ? 'X' : scores.O >= ext.target ? 'O' : null;
    return {
      ...next,
      scores,
      step: s.step + 1,
      submitted: { X: false, O: false },
      ext: {
        ...ext,
        picks: { X: null, O: null },
        history: [...ext.history, { X: picks.X, O: picks.O, winner }],
      },
      lastMove: { index: choice, cell: choice, mark, completedBoxes: [] },
      status: matchWinner ? 'COMPLETED' : 'IN_PROGRESS',
      winner: matchWinner,
    };
  },
  redact: (s, viewer) => {
    const ext = s.ext as RpsExt;
    return { ...s, ext: { ...ext, picks: hideChoices(ext.picks, viewer) } };
  },
};

/* ------------------------------ know-me & in-sync ------------------------------ */

export function quizBank(mode: QuizExt['mode']) {
  return mode === 'know-me' ? KNOW_ME_QUESTIONS : IN_SYNC_QUESTIONS;
}

/** In know-me, X is in the spotlight on even questions and O on odd ones. */
export function quizSubject(ext: QuizExt): Mark | null {
  return ext.mode === 'know-me' ? (ext.q % 2 === 0 ? 'X' : 'O') : null;
}

export function currentQuestion(ext: QuizExt) {
  const id = ext.questions[ext.q];
  return id === undefined ? null : { id, ...quizBank(ext.mode)[id]! };
}

function quizDef(mode: QuizExt['mode']): GameDef {
  const gameType = mode;
  return {
    create: (rng) => {
      const ids = shuffle(
        quizBank(mode).map((_, i) => i),
        rng,
      ).slice(0, QUIZ_QUESTIONS_PER_ROUND);
      const ext: QuizExt = {
        kind: 'quiz',
        mode,
        questions: ids,
        q: 0,
        answers: { X: null, O: null },
        history: [],
      };
      return { ...baseState(gameType), turnMode: 'simultaneous', ext };
    },
    inputRange: (s) => currentQuestion(s.ext as QuizExt)?.options.length ?? 0,
    validate: () => OK,
    apply: (s, choice, mark) => {
      const ext = s.ext as QuizExt;
      const answers = { ...ext.answers, [mark]: choice };
      const next = lockIn(s, mark);
      if (answers.X === null || answers.O === null) return { ...next, ext: { ...ext, answers } };

      const match = answers.X === answers.O;
      const subject = quizSubject(ext);
      let scores = s.scores;
      if (match && subject) {
        const guesser = other(subject);
        scores = { ...scores, [guesser]: scores[guesser] + 1 };
      } else if (match) {
        scores = { X: scores.X + 1, O: scores.O + 1 }; // shared sync score
      }
      const q = ext.q + 1;
      const finished = q >= ext.questions.length;
      const result = finished
        ? mode === 'in-sync'
          ? { winner: null, isDraw: true }
          : byScore(scores)
        : { winner: null, isDraw: false };
      return {
        ...next,
        scores,
        step: s.step + 1,
        submitted: { X: false, O: false },
        ext: {
          ...ext,
          q,
          answers: { X: null, O: null },
          history: [
            ...ext.history,
            { qid: ext.questions[ext.q]!, subject, X: answers.X, O: answers.O, match },
          ],
        },
        lastMove: { index: choice, cell: choice, mark, completedBoxes: [] },
        status: finished ? 'COMPLETED' : 'IN_PROGRESS',
        winner: result.winner,
        isDraw: result.isDraw,
      };
    },
    redact: (s, viewer) => {
      const ext = s.ext as QuizExt;
      return { ...s, ext: { ...ext, answers: hideChoices(ext.answers, viewer) } };
    },
  };
}

export const knowMeDef = quizDef('know-me');
export const inSyncDef = quizDef('in-sync');

/* --------------------------------- memory match --------------------------------- */

export const memoryDef: GameDef = {
  create: (rng) => {
    const s = baseState('memory-match');
    const pairs = (s.rows * s.cols) / 2;
    const faces = shuffle(MEMORY_FACES, rng).slice(0, pairs);
    const cards = shuffle([...faces, ...faces], rng);
    const ext: MemoryExt = {
      kind: 'memory',
      cards,
      matched: Array(cards.length).fill(null),
      flipped: [],
      lastMiss: [],
    };
    return { ...s, ext };
  },
  inputRange: (s) => (s.ext as MemoryExt).cards.length,
  validate: (s, i) => {
    const ext = s.ext as MemoryExt;
    return ext.matched[i] !== null || ext.flipped.includes(i)
      ? fail('CELL_OCCUPIED', 'That card is already face up.')
      : OK;
  },
  apply: (s, i, mark) => {
    const ext = s.ext as MemoryExt;
    const base = {
      ...s,
      moveCount: s.moveCount + 1,
      step: s.step + 1,
      lastMove: { index: i, cell: i, mark, completedBoxes: [] },
    };
    if (ext.flipped.length === 0) {
      return { ...base, ext: { ...ext, flipped: [i], lastMiss: [] } };
    }
    const first = ext.flipped[0]!;
    if (ext.cards[first] === ext.cards[i]) {
      const matched: Cell[] = ext.matched.slice();
      matched[first] = mark;
      matched[i] = mark;
      const scores = { ...s.scores, [mark]: s.scores[mark] + 1 };
      const finished = matched.every((m) => m !== null);
      const result = finished ? byScore(scores) : { winner: null, isDraw: false };
      return {
        ...base,
        scores,
        ext: { ...ext, matched, flipped: [] },
        status: finished ? 'COMPLETED' : 'IN_PROGRESS',
        winner: result.winner,
        isDraw: result.isDraw,
      };
    }
    return {
      ...base,
      ext: { ...ext, flipped: [], lastMiss: [first, i] },
      currentTurn: other(mark),
    };
  },
  redact: (s) => {
    const ext = s.ext as MemoryExt;
    const visible = (i: number) =>
      ext.matched[i] !== null || ext.flipped.includes(i) || ext.lastMiss.includes(i);
    return { ...s, ext: { ...ext, cards: ext.cards.map((c, i) => (visible(i) ? c : '')) } };
  },
};
