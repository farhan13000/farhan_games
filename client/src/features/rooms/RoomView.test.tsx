import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { applyMove, createInitialGameState } from '@arena/shared';
import { completedSnapshot, ME, OPP, snapshot } from '../../test/fixtures';
import { RoomView, type RoomViewProps } from './RoomView';

function renderRoom(overrides: Partial<RoomViewProps> = {}) {
  const props: RoomViewProps = {
    snapshot: snapshot(),
    myPlayerId: ME,
    connection: 'connected',
    pendingMove: false,
    busy: { rematch: false, leave: false, create: false },
    chatEnabled: true,
    chat: [],
    reactions: [],
    onMove: vi.fn(),
    onPropose: vi.fn(),
    onRespond: vi.fn(),
    onLeave: vi.fn(),
    onNewRoom: vi.fn(),
    onRetryConnection: vi.fn(),
    onSendChat: vi.fn().mockResolvedValue(true),
    onReact: vi.fn(),
    onReactionDone: vi.fn(),
    ...overrides,
  };
  render(
    <MemoryRouter>
      <RoomView {...props} />
    </MemoryRouter>,
  );
  return props;
}

describe('waiting room', () => {
  it('shows the room code, copy actions and a waiting indicator', () => {
    const onLeave = vi.fn();
    renderRoom({
      snapshot: snapshot({ status: 'WAITING_FOR_PLAYER', players: [snapshot().players[0]!] }),
      onLeave,
    });
    expect(screen.getByRole('heading', { name: /invite your partner/i })).toBeInTheDocument();
    expect(screen.getByTestId('room-code')).toHaveTextContent('ABC234');
    expect(screen.getByRole('button', { name: /copy code/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy invite link/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue(/\/room\/ABC234$/)).toBeInTheDocument();
    expect(screen.getByText(/waiting for your friend to join/i)).toBeInTheDocument();
  });

  it('lets the host close the room', async () => {
    const props = renderRoom({
      snapshot: snapshot({ status: 'WAITING_FOR_PLAYER', players: [snapshot().players[0]!] }),
    });
    await userEvent.click(screen.getByRole('button', { name: /close room/i }));
    expect(props.onLeave).toHaveBeenCalled();
  });
});

describe('turn rendering', () => {
  it('announces my turn and enables empty cells', async () => {
    const props = renderRoom();
    expect(screen.getByTestId('status-message')).toHaveTextContent('Your turn');
    const cell = screen.getByRole('gridcell', { name: /row 1, column 1: empty/i });
    expect(cell).toHaveAttribute('aria-disabled', 'false');
    await userEvent.click(cell);
    expect(props.onMove).toHaveBeenCalledWith(0);
  });

  it("shows the opponent's turn and disables the board", async () => {
    const game = applyMove(createInitialGameState(), 4, 'X');
    const props = renderRoom({ snapshot: snapshot({ status: 'IN_PROGRESS', game }) });
    expect(screen.getByTestId('status-message')).toHaveTextContent("Gus's turn");
    expect(screen.getByTestId('move-count')).toHaveTextContent('1');
    const cells = screen.getAllByRole('gridcell');
    cells.forEach((c) => expect(c).toHaveAttribute('aria-disabled', 'true'));
    await userEvent.click(cells[0]!);
    expect(props.onMove).not.toHaveBeenCalled();
  });

  it('labels both player cards with names, marks and presence text', () => {
    renderRoom({
      snapshot: snapshot({
        players: [snapshot().players[0]!, { ...snapshot().players[1]!, connected: false }],
      }),
    });
    const x = screen.getByRole('region', { name: /player x: hana \(you\)/i });
    const o = screen.getByRole('region', { name: /player o: gus/i });
    expect(within(x).getByText('You')).toBeInTheDocument();
    expect(within(o).getByText(/reconnecting/i)).toBeInTheDocument();
  });

  it('blocks input while a move is pending (no double submissions)', () => {
    renderRoom({ pendingMove: true });
    screen
      .getAllByRole('gridcell')
      .forEach((c) => expect(c).toHaveAttribute('aria-disabled', 'true'));
  });
});

describe('results', () => {
  it('renders a win with the winning line', () => {
    renderRoom({ snapshot: completedSnapshot() });
    expect(screen.getByTestId('status-message')).toHaveTextContent('You won this round!');
    expect(screen.getByRole('heading', { name: /you win/i })).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell', { name: /winning line/i })).toHaveLength(3);
  });

  it('renders a loss from the other perspective', () => {
    renderRoom({ snapshot: completedSnapshot(), myPlayerId: OPP });
    expect(screen.getByTestId('status-message')).toHaveTextContent('Hana won this round.');
    expect(screen.getByRole('heading', { name: /hana wins/i })).toBeInTheDocument();
  });

  it('renders a closed room with the reason', () => {
    renderRoom({ snapshot: completedSnapshot({ status: 'CANCELLED', endReason: 'PLAYER_LEFT' }) });
    expect(screen.getByRole('heading', { name: /room closed/i })).toBeInTheDocument();
    expect(screen.getByText(/gus left the match\. you win by forfeit/i)).toBeInTheDocument();
  });
});

describe('playing again: rematch or another game', () => {
  it('requests a rematch', async () => {
    const props = renderRoom({ snapshot: completedSnapshot() });
    await userEvent.click(screen.getByRole('button', { name: /^rematch$/i }));
    expect(props.onPropose).toHaveBeenCalledWith();
  });

  it('proposes a different game from the end-of-round panel', async () => {
    const props = renderRoom({ snapshot: completedSnapshot() });
    await userEvent.click(screen.getByRole('button', { name: /play something else/i }));
    await userEvent.click(screen.getByRole('button', { name: /reversi/i }));
    expect(props.onPropose).toHaveBeenCalledWith('reversi');
  });

  it('waits for the partner after voting', () => {
    renderRoom({ snapshot: completedSnapshot({ rematchVotes: [ME] }) });
    expect(screen.getByText(/waiting for gus to accept the rematch/i)).toBeInTheDocument();
  });

  it('lets me accept or decline when the partner suggests a game', async () => {
    const props = renderRoom({
      snapshot: completedSnapshot({ rematchVotes: [OPP], nextGameType: 'know-me' }),
    });
    expect(screen.getByText(/gus wants to play .*how well do you know me/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /let's play/i }));
    expect(props.onRespond).toHaveBeenCalledWith(true);
    await userEvent.click(screen.getByRole('button', { name: /decline/i }));
    expect(props.onRespond).toHaveBeenCalledWith(false);
  });

  it('shows a mid-round switch request as a banner', async () => {
    const props = renderRoom({ snapshot: snapshot({ rematchVotes: [OPP], nextGameType: 'hex' }) });
    expect(screen.getByText(/gus wants to switch to hex/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /not now/i }));
    expect(props.onRespond).toHaveBeenCalledWith(false);
  });

  it('opens the game menu from the room header', async () => {
    const props = renderRoom();
    await userEvent.click(screen.getByRole('button', { name: /switch game/i }));
    expect(screen.getByRole('dialog', { name: /switch game/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /mancala/i }));
    expect(props.onPropose).toHaveBeenCalledWith('mancala');
  });

  it('shows a co-op result for In Sync', () => {
    let game = createInitialGameState('in-sync');
    for (let i = 0; i < 10; i++) game = applyMove(applyMove(game, 0, 'X'), i < 9 ? 0 : 1, 'O');
    renderRoom({
      snapshot: snapshot({
        status: 'COMPLETED',
        gameType: 'in-sync',
        nextGameType: 'in-sync',
        game,
      }),
    });
    expect(screen.getByRole('heading', { name: '9/10 in sync' })).toBeInTheDocument();
    expect(screen.getByText(/soulmates/i)).toBeInTheDocument();
  });
});

describe('simultaneous games', () => {
  it('shows locked-in states for secret picks', () => {
    const game = applyMove(createInitialGameState('rock-paper-scissors'), 0, 'X');
    renderRoom({
      snapshot: snapshot({ status: 'IN_PROGRESS', gameType: 'rock-paper-scissors', game }),
    });
    expect(screen.getByTestId('status-message')).toHaveTextContent(/locked in\. waiting for gus/i);
    expect(
      within(screen.getByRole('region', { name: /player x/i })).getByText('Locked in'),
    ).toBeInTheDocument();
  });
});

describe('connection states', () => {
  it('shows a reconnecting banner and disables the board', () => {
    renderRoom({ connection: 'reconnecting' });
    expect(screen.getByRole('status', { name: '' })).toBeDefined();
    expect(screen.getByText(/reconnecting… your game is safe/i)).toBeInTheDocument();
    screen
      .getAllByRole('gridcell')
      .forEach((c) => expect(c).toHaveAttribute('aria-disabled', 'true'));
  });

  it('offers a retry when offline', async () => {
    const props = renderRoom({ connection: 'offline' });
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(props.onRetryConnection).toHaveBeenCalled();
  });
});
