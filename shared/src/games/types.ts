import type { Mark } from '../constants';

export const GAME_TYPES = [
  'tic-tac-toe',
  'four-in-a-row',
  'five-in-a-row',
  'dots-and-boxes',
  'reversi',
  'ultimate-tic-tac-toe',
  'mancala',
  'hex',
  'know-me',
  'in-sync',
  'rock-paper-scissors',
  'memory-match',
] as const;
export type GameType = (typeof GAME_TYPES)[number];

export type GameCategory = 'classic' | 'strategy' | 'social';

/** Selects the rules module and the board renderer. */
export type GameKind =
  'grid' | 'drop' | 'dots' | 'reversi' | 'uttt' | 'mancala' | 'hex' | 'rps' | 'quiz' | 'memory';

/** `null` = empty, otherwise the mark occupying the cell / owning the line or box. */
export type Cell = Mark | null;

/** Players either alternate turns or both submit a secret choice each step. */
export type TurnMode = 'alternate' | 'simultaneous';

/** Placeholder the server sends instead of an opponent's secret choice. */
export const HIDDEN_CHOICE = -1;

export interface LastMove {
  /** Index submitted by the player (cell, column, line, pit, card or option). */
  index: number;
  /** Resulting board index (e.g. the landing cell for drop games). */
  cell: number;
  mark: Mark;
  /** Boxes completed by this move (dots-and-boxes only). */
  completedBoxes: number[];
}

/* ---------------------- game-specific state extensions --------------------- */

export interface ReversiExt {
  kind: 'reversi';
  /** Discs flipped by the last move (for animation). */
  flipped: number[];
  /** Set when a player had no legal move and was skipped. */
  passed: Mark | null;
}

export interface UtttExt {
  kind: 'uttt';
  /** Result of each of the 9 small boards: winner, 'D' (drawn) or null (open). */
  macro: Array<Mark | 'D' | null>;
  /** Small board the next player must play in, or null for any open board. */
  forced: number | null;
  macroLine: number[] | null;
}

export interface MancalaExt {
  kind: 'mancala';
  /** 14 pits: X side 0-5, X store 6, O side 7-12, O store 13. */
  pits: number[];
  /** Pits emptied by a capture on the last move. */
  captured: number[];
  extraTurn: boolean;
}

export interface RpsRound {
  X: number;
  O: number;
  winner: Mark | null;
}

export interface RpsExt {
  kind: 'rps';
  /** Wins needed to take the match. */
  target: number;
  /** Current secret picks (0 rock, 1 paper, 2 scissors); HIDDEN_CHOICE when redacted. */
  picks: Record<Mark, number | null>;
  history: RpsRound[];
}

export interface QuizRound {
  qid: number;
  /** For know-me: whose answer was being guessed. Null for in-sync. */
  subject: Mark | null;
  X: number;
  O: number;
  match: boolean;
}

export interface QuizExt {
  kind: 'quiz';
  mode: 'know-me' | 'in-sync';
  /** Question ids for this round, in play order. */
  questions: number[];
  /** Index into `questions` of the current question. */
  q: number;
  answers: Record<Mark, number | null>;
  history: QuizRound[];
}

export interface MemoryExt {
  kind: 'memory';
  /** Card faces; '' for cards that are face down (redacted). */
  cards: string[];
  matched: Cell[];
  /** Cards flipped so far in the current turn (0 or 1). */
  flipped: number[];
  /** The last mismatched pair, shown face up until the next flip. */
  lastMiss: number[];
}

export type GameExt = ReversiExt | UtttExt | MancalaExt | RpsExt | QuizExt | MemoryExt;

/**
 * Unified, serializable state shared by every game. Board-style games use
 * `board` (row-major cells; for dots-and-boxes, line owners). Other games keep
 * their specifics in `ext`.
 */
export interface GameState {
  gameType: GameType;
  rows: number;
  cols: number;
  winLength: number;
  board: Cell[];
  boxes: Cell[];
  turnMode: TurnMode;
  currentTurn: Mark;
  /** Simultaneous games: who has locked in a choice for the current step. */
  submitted: Record<Mark, boolean>;
  status: 'IN_PROGRESS' | 'COMPLETED';
  winner: Mark | null;
  isDraw: boolean;
  winningLine: number[] | null;
  moveCount: number;
  /** Concurrency token clients echo back with each move (stale-state guard). */
  step: number;
  lastMove: LastMove | null;
  scores: Record<Mark, number>;
  ext: GameExt | null;
}

export type MoveErrorCode =
  'GAME_NOT_IN_PROGRESS' | 'NOT_YOUR_TURN' | 'INVALID_INDEX' | 'CELL_OCCUPIED' | 'ILLEGAL_MOVE';

export type MoveValidation = { ok: true } | { ok: false; code: MoveErrorCode; message: string };

export interface GameInfo {
  id: GameType;
  name: string;
  emoji: string;
  category: GameCategory;
  tagline: string;
  description: string;
  kind: GameKind;
  rows: number;
  cols: number;
  winLength: number;
  duration: string;
  /** Cooperative games have no winner: players score together. */
  coop: boolean;
  rules: string[];
}
