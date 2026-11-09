import type { ComponentType } from 'react';
import { GAME_CATALOG, type GameKind } from '@arena/shared';
import { DotsBoard } from './DotsBoard';
import { DropBoard } from './DropBoard';
import { GridBoard } from './GridBoard';
import { HexBoard } from './HexBoard';
import { MancalaBoard } from './MancalaBoard';
import { ReversiBoard } from './ReversiBoard';
import { MemoryBoard, QuizBoard, RpsBoard } from './SocialBoards';
import type { BoardProps } from './types';
import { UtttBoard } from './UtttBoard';

const BOARDS: Record<GameKind, ComponentType<BoardProps>> = {
  grid: GridBoard,
  drop: DropBoard,
  dots: DotsBoard,
  reversi: ReversiBoard,
  uttt: UtttBoard,
  mancala: MancalaBoard,
  hex: HexBoard,
  rps: RpsBoard,
  quiz: QuizBoard,
  memory: MemoryBoard,
};

export function GameBoard(props: BoardProps) {
  const Board = BOARDS[GAME_CATALOG[props.game.gameType].kind];
  return <Board {...props} />;
}
