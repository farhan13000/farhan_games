import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { applyMove, createInitialGameState, reversiLegalMoves, type QuizExt } from '@arena/shared';
import { NAMES } from '../../test/fixtures';
import { HexBoard } from './HexBoard';
import { MancalaBoard } from './MancalaBoard';
import { ReversiBoard } from './ReversiBoard';
import { MemoryBoard, QuizBoard, RpsBoard } from './SocialBoards';
import { UtttBoard } from './UtttBoard';

const props = (onMove = vi.fn()) => ({
  myMark: 'X' as const,
  interactive: true,
  onMove,
  names: NAMES,
});

describe('ReversiBoard', () => {
  it('only enables legal moves', async () => {
    const onMove = vi.fn();
    const game = createInitialGameState('reversi');
    render(<ReversiBoard game={game} {...props(onMove)} />);
    const legal = reversiLegalMoves(game.board, 8, 'X');
    expect(screen.getAllByRole('gridcell', { name: /legal move/ })).toHaveLength(legal.length);
    await userEvent.click(screen.getByRole('gridcell', { name: /row 1, column 1: empty/i }));
    expect(onMove).not.toHaveBeenCalled();
    await userEvent.click(screen.getAllByRole('gridcell', { name: /legal move/ })[0]!);
    expect(onMove).toHaveBeenCalledWith(legal[0]);
  });
});

describe('UtttBoard', () => {
  it('restricts play to the forced small board', async () => {
    const onMove = vi.fn();
    const game = applyMove(createInitialGameState('ultimate-tic-tac-toe'), 4 * 9 + 2, 'X'); // O sent to board 3
    render(<UtttBoard game={game} myMark="O" interactive onMove={onMove} names={NAMES} />);
    expect(screen.getByRole('gridcell', { name: 'Board 1, cell 1: empty' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await userEvent.click(screen.getByRole('gridcell', { name: 'Board 3, cell 1: empty' }));
    expect(onMove).toHaveBeenCalledWith(18);
  });
});

describe('MancalaBoard', () => {
  it('lets me sow only from my own non-empty pits', async () => {
    const onMove = vi.fn();
    render(<MancalaBoard game={createInitialGameState('mancala')} {...props(onMove)} />);
    await userEvent.click(screen.getByRole('button', { name: 'Your pit 3: 4 seeds' }));
    expect(onMove).toHaveBeenCalledWith(2);
    expect(screen.getByRole('button', { name: "Gus's pit 1: 4 seeds" })).toBeDisabled();
  });
});

describe('HexBoard', () => {
  it('renders 81 hexagons and plays an empty one', async () => {
    const onMove = vi.fn();
    render(<HexBoard game={createInitialGameState('hex')} {...props(onMove)} />);
    expect(screen.getAllByRole('gridcell')).toHaveLength(81);
    await userEvent.click(screen.getByRole('gridcell', { name: 'Row 5, column 5: empty' }));
    expect(onMove).toHaveBeenCalledWith(40);
  });
});

describe('RpsBoard', () => {
  it('offers three throws, then shows a locked-in state', async () => {
    const onMove = vi.fn();
    const { rerender } = render(
      <RpsBoard game={createInitialGameState('rock-paper-scissors')} {...props(onMove)} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /paper/i }));
    expect(onMove).toHaveBeenCalledWith(1);
    const locked = applyMove(createInitialGameState('rock-paper-scissors'), 1, 'X');
    rerender(<RpsBoard game={locked} {...props(onMove)} interactive={false} />);
    expect(screen.getByText(/locked in!/i)).toBeInTheDocument();
  });

  it('reveals both throws after a round', () => {
    let game = createInitialGameState('rock-paper-scissors');
    game = applyMove(applyMove(game, 0, 'X'), 2, 'O');
    render(<RpsBoard game={game} {...props()} />);
    expect(screen.getByText(/you take it/i)).toBeInTheDocument();
  });
});

describe('QuizBoard', () => {
  it('puts the spotlight player on the right prompt and lists options', async () => {
    const onMove = vi.fn();
    const game = createInitialGameState('know-me');
    render(<QuizBoard game={game} {...props(onMove)} />);
    expect(screen.getByText(/answer honestly about yourself/i)).toBeInTheDocument();
    const firstOption = screen.getAllByRole('button')[0]!;
    await userEvent.click(firstOption);
    expect(onMove).toHaveBeenCalledWith(0);
  });

  it('tells the guesser whose answer to guess', () => {
    render(
      <QuizBoard
        game={createInitialGameState('know-me')}
        myMark="O"
        interactive
        onMove={vi.fn()}
        names={NAMES}
      />,
    );
    expect(screen.getByText(/guess what hana picked/i)).toBeInTheDocument();
  });

  it('shows the reveal after both answer', () => {
    let game = createInitialGameState('in-sync');
    game = applyMove(applyMove(game, 0, 'X'), 0, 'O');
    render(<QuizBoard game={game} {...props()} />);
    expect(screen.getByText(/in sync!/i)).toBeInTheDocument();
    expect((game.ext as QuizExt).q).toBe(1);
  });
});

describe('MemoryBoard', () => {
  it('flips face-down cards only', async () => {
    const onMove = vi.fn();
    const game = createInitialGameState('memory-match');
    const hidden = {
      ...game,
      ext: { ...game.ext!, cards: (game.ext as { cards: string[] }).cards.map(() => '') },
    } as typeof game;
    render(<MemoryBoard game={hidden} {...props(onMove)} />);
    expect(screen.getAllByRole('gridcell', { name: /face down/ })).toHaveLength(20);
    await userEvent.click(screen.getByRole('gridcell', { name: 'Card 1: face down' }));
    expect(onMove).toHaveBeenCalledWith(0);
  });
});
