import type { Mark } from '../constants';
import type { Cell } from './types';

export interface WinResult {
  winner: Mark;
  line: number[];
}

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal (down-right)
  [1, -1], // anti-diagonal (down-left)
];

/**
 * Returns the first line of `winLength` identical marks on a rows x cols board,
 * or null. Defaults describe classic 3x3 Tic-Tac-Toe.
 */
export function getWinner(
  board: readonly Cell[],
  rows = 3,
  cols = 3,
  winLength = 3,
): WinResult | null {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const mark = board[r * cols + c];
      if (!mark) continue;
      for (const [dr, dc] of DIRECTIONS) {
        const endR = r + dr * (winLength - 1);
        const endC = c + dc * (winLength - 1);
        if (endR < 0 || endR >= rows || endC < 0 || endC >= cols) continue;
        const line: number[] = [];
        for (let k = 0; k < winLength; k++) {
          const idx = (r + dr * k) * cols + (c + dc * k);
          if (board[idx] !== mark) break;
          line.push(idx);
        }
        if (line.length === winLength) return { winner: mark, line };
      }
    }
  }
  return null;
}

export function isBoardFull(board: readonly Cell[]): boolean {
  return board.every((cell) => cell !== null);
}

/** A draw is a full board with no winning line. */
export function isDraw(board: readonly Cell[], rows = 3, cols = 3, winLength = 3): boolean {
  return isBoardFull(board) && getWinner(board, rows, cols, winLength) === null;
}

export function getNextTurn(mark: Mark): Mark {
  return mark === 'X' ? 'O' : 'X';
}

/** Lowest empty cell index in a column for gravity ("drop") games, or -1 if full. */
export function getDropCell(
  board: readonly Cell[],
  rows: number,
  cols: number,
  column: number,
): number {
  for (let r = rows - 1; r >= 0; r--) {
    const idx = r * cols + column;
    if (board[idx] === null) return idx;
  }
  return -1;
}
