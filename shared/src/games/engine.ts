import type { Mark } from '../constants';
import type { GameDef, Rng } from './defs/base';
import { dotsDef, dropDef, gridDef } from './defs/classic';
import { hexDef } from './defs/hex';
import { mancalaDef } from './defs/mancala';
import { reversiDef } from './defs/reversi';
import { inSyncDef, knowMeDef, memoryDef, rpsDef } from './defs/social';
import { utttDef } from './defs/uttt';
import type { GameState, GameType, MoveValidation } from './types';

/**
 * Pure, framework-independent game engine. Every function returns new objects
 * and never mutates its input, so the server can validate, apply and persist
 * moves atomically, and the same rules are unit-testable in isolation.
 */

const DEFS: Record<GameType, GameDef> = {
  'tic-tac-toe': gridDef('tic-tac-toe'),
  'five-in-a-row': gridDef('five-in-a-row'),
  'four-in-a-row': dropDef,
  'dots-and-boxes': dotsDef,
  reversi: reversiDef,
  'ultimate-tic-tac-toe': utttDef,
  mancala: mancalaDef,
  hex: hexDef,
  'know-me': knowMeDef,
  'in-sync': inSyncDef,
  'rock-paper-scissors': rpsDef,
  'memory-match': memoryDef,
};

export type { Rng };

/** `rng` drives shuffling (questions, cards). The server passes a CSPRNG-backed source. */
export function createInitialGameState(
  gameType: GameType = 'tic-tac-toe',
  rng: Rng = Math.random,
): GameState {
  return DEFS[gameType].create(rng);
}

/** Whether `mark` may submit a move right now. */
export function canAct(state: GameState, mark: Mark | null): boolean {
  if (!mark || state.status !== 'IN_PROGRESS') return false;
  return state.turnMode === 'simultaneous' ? !state.submitted[mark] : state.currentTurn === mark;
}

/** Number of valid move indices (cells, columns, lines, pits, cards or options). */
export function getInputRange(state: GameState): number {
  return DEFS[state.gameType].inputRange(state);
}

export function validateMove(state: GameState, index: number, mark: Mark): MoveValidation {
  if (state.status !== 'IN_PROGRESS') {
    return { ok: false, code: 'GAME_NOT_IN_PROGRESS', message: 'The round is already over.' };
  }
  if (!canAct(state, mark)) {
    return {
      ok: false,
      code: 'NOT_YOUR_TURN',
      message:
        state.turnMode === 'simultaneous'
          ? 'You already locked in your answer.'
          : "It's not your turn.",
    };
  }
  if (!Number.isInteger(index) || index < 0 || index >= getInputRange(state)) {
    return { ok: false, code: 'INVALID_INDEX', message: 'That move is outside the board.' };
  }
  return DEFS[state.gameType].validate(state, index, mark);
}

/** Applies a move after validating it. Throws if the move is invalid. */
export function applyMove(state: GameState, index: number, mark: Mark): GameState {
  const validation = validateMove(state, index, mark);
  if (!validation.ok) throw new Error(`${validation.code}: ${validation.message}`);
  return DEFS[state.gameType].apply(state, index, mark);
}

/** The view of the state a given player (or a non-player, `null`) is allowed to see. */
export function redactGameState(state: GameState, viewer: Mark | null): GameState {
  const redact = DEFS[state.gameType].redact;
  return redact ? redact(state, viewer) : state;
}
