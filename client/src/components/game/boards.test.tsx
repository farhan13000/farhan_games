import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { applyMove, createInitialGameState, type GameState } from '@arena/shared';
import { DotsBoard } from './DotsBoard';
import { DropBoard } from './DropBoard';
import { GridBoard } from './GridBoard';
import { NAMES } from '../../test/fixtures';

function play(state: GameState, moves: number[]) {
  return moves.reduce((s, i) => applyMove(s, i, s.currentTurn), state);
}

describe('GridBoard', () => {
  it('disables occupied cells and plays empty ones', async () => {
    const onMove = vi.fn();
    const game = applyMove(createInitialGameState(), 4, 'X');
    render(<GridBoard game={game} myMark="O" interactive onMove={onMove} names={NAMES} />);
    const occupied = screen.getByRole('gridcell', { name: /row 2, column 2: X, last move/i });
    expect(occupied).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(occupied);
    expect(onMove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('gridcell', { name: /row 1, column 3: empty/i }));
    expect(onMove).toHaveBeenCalledWith(2);
  });

  it('supports keyboard navigation with a single tab stop', async () => {
    const onMove = vi.fn();
    render(
      <GridBoard
        game={createInitialGameState()}
        myMark="X"
        interactive
        onMove={onMove}
        names={NAMES}
      />,
    );
    const cells = screen.getAllByRole('gridcell');
    expect(cells.filter((c) => c.tabIndex === 0)).toHaveLength(1);

    await userEvent.tab();
    expect(cells[0]).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(cells[1]).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(cells[4]).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(cells[5]).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onMove).toHaveBeenCalledWith(5);
    await userEvent.keyboard('{ArrowLeft} ');
    expect(onMove).toHaveBeenLastCalledWith(4);
  });

  it('renders a large five-in-a-row board', () => {
    render(
      <GridBoard
        game={createInitialGameState('five-in-a-row')}
        myMark="X"
        interactive={false}
        onMove={vi.fn()}
        names={NAMES}
      />,
    );
    expect(screen.getAllByRole('gridcell')).toHaveLength(169);
    expect(screen.getByRole('grid', { name: /13 by 13/i })).toBeInTheDocument();
  });
});

describe('DropBoard', () => {
  it('drops into a column and disables full columns', async () => {
    const onMove = vi.fn();
    const game = play(createInitialGameState('four-in-a-row'), [0, 0, 0, 0, 0, 0]);
    render(<DropBoard game={game} myMark="X" interactive onMove={onMove} names={NAMES} />);
    const full = screen.getByRole('button', { name: /column 1, 0 of 6 slots free/i });
    expect(full).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(full);
    expect(onMove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /column 4, 6 of 6 slots free/i }));
    expect(onMove).toHaveBeenCalledWith(3);
  });
});

describe('DotsBoard', () => {
  it('draws open lines and blocks drawn ones', async () => {
    const onMove = vi.fn();
    const game = applyMove(createInitialGameState('dots-and-boxes'), 0, 'X');
    render(<DotsBoard game={game} myMark="O" interactive onMove={onMove} names={NAMES} />);
    const drawn = screen.getByRole('button', {
      name: /horizontal line, row 1, between dots 1 and 2, drawn by X/i,
    });
    expect(drawn).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(
      screen.getByRole('button', { name: /horizontal line, row 1, between dots 2 and 3, open/i }),
    );
    expect(onMove).toHaveBeenCalledWith(1);
  });
});
