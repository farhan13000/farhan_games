import type { GameState, Mark } from '@arena/shared';

export interface BoardProps {
  game: GameState;
  /** The local player's mark, or null for observers. */
  myMark: Mark | null;
  /** True when the local player may move right now. */
  interactive: boolean;
  onMove: (index: number) => void;
  /** Display names by mark (used by the social games). */
  names: Record<Mark, string>;
}
