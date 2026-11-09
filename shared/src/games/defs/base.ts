import type { Mark } from '../../constants';
import { GAME_CATALOG } from '../catalog';
import type { GameState, GameType, MoveErrorCode, MoveValidation } from '../types';

export type Rng = () => number;

/** A game's rules. The engine performs the generic checks (status, turn, bounds) first. */
export interface GameDef {
  create(rng: Rng): GameState;
  /** Number of valid move indices in this state. */
  inputRange(state: GameState): number;
  validate(state: GameState, index: number, mark: Mark): MoveValidation;
  /** Applies an already-validated move and returns a new state. */
  apply(state: GameState, index: number, mark: Mark): GameState;
  /** Hides information the viewer must not see (opponent's secret picks, face-down cards). */
  redact?(state: GameState, viewer: Mark | null): GameState;
}

export const OK: MoveValidation = { ok: true };

export function fail(code: MoveErrorCode, message: string): MoveValidation {
  return { ok: false, code, message };
}

export function other(mark: Mark): Mark {
  return mark === 'X' ? 'O' : 'X';
}

export function baseState(gameType: GameType, overrides: Partial<GameState> = {}): GameState {
  const info = GAME_CATALOG[gameType];
  return {
    gameType,
    rows: info.rows,
    cols: info.cols,
    winLength: info.winLength,
    board: [],
    boxes: [],
    turnMode: 'alternate',
    currentTurn: 'X',
    submitted: { X: false, O: false },
    status: 'IN_PROGRESS',
    winner: null,
    isDraw: false,
    winningLine: null,
    moveCount: 0,
    step: 0,
    lastMove: null,
    scores: { X: 0, O: 0 },
    ext: null,
    ...overrides,
  };
}

/** Winner by higher score, or a draw on equal scores. */
export function byScore(scores: Record<Mark, number>): { winner: Mark | null; isDraw: boolean } {
  if (scores.X === scores.O) return { winner: null, isDraw: true };
  return { winner: scores.X > scores.O ? 'X' : 'O', isDraw: false };
}

/** Fisher-Yates shuffle using the injected random source. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
