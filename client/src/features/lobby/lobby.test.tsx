import type * as SocketModule from '../../lib/socket';
import type * as ApiModule from '../../lib/api';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '../../app/router';
import { useAuthStore } from '../../store/authStore';
import { guestAuth, snapshot } from '../../test/fixtures';

const request = vi.fn();
vi.mock('../../lib/socket', async (importOriginal) => {
  const actual = await importOriginal<typeof SocketModule>();
  return {
    ...actual,
    socketManager: {
      request: (...args: unknown[]) => request(...args),
      ensure: () => ({ on: vi.fn(), off: vi.fn() }),
      disconnect: vi.fn(),
      nudge: vi.fn(),
      current: null,
    },
  };
});

const guest = vi.fn();
vi.mock('../../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, sessionApi: { ...actual.sessionApi, start: (name: string) => guest(name) } };
});

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  request.mockReset();
  guest.mockReset();
  useAuthStore.getState().clear();
});

describe('landing page', () => {
  it('shows primary actions and navigates to room creation', async () => {
    const router = renderAt('/');
    expect(
      screen.getByRole('heading', { level: 1, name: /your private game night/i }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: /create private room/i }));
    expect(router.state.location.pathname).toBe('/create');
    expect(await screen.findByRole('heading', { name: /create your room/i })).toBeInTheDocument();
  });

  it('navigates to the join page', async () => {
    const router = renderAt('/');
    await userEvent.click(screen.getByRole('link', { name: /^join room$/i }));
    expect(router.state.location.pathname).toBe('/join');
  });

  it('lists every game', () => {
    renderAt('/');
    for (const name of [
      'Tic-Tac-Toe',
      'Reversi',
      'How Well Do You Know Me?',
      'In Sync',
      'Rock Paper Scissors',
      'Memory Match',
      'Mancala',
      'Hex',
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });
});

describe('create room', () => {
  it('requires a valid display name for guests', async () => {
    renderAt('/create');
    await userEvent.click(screen.getByRole('button', { name: /create private room/i }));
    expect(await screen.findByText(/use at least 2 characters/i)).toBeInTheDocument();
    expect(guest).not.toHaveBeenCalled();
  });

  it('creates a guest session, then the room for the chosen game', async () => {
    guest.mockResolvedValue(guestAuth);
    request.mockResolvedValue({
      snapshot: snapshot({ status: 'WAITING_FOR_PLAYER' }, 'four-in-a-row'),
    });
    const router = renderAt('/create?game=four-in-a-row');
    expect(screen.getByRole('radio', { name: /four in a row/i })).toBeChecked();
    await userEvent.type(screen.getByLabelText(/your display name/i), 'Hana');
    await userEvent.click(screen.getByRole('button', { name: /create private room/i }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith('room:create', { gameType: 'four-in-a-row' }),
    );
    expect(guest).toHaveBeenCalledWith('Hana');
    await waitFor(() => expect(router.state.location.pathname).toBe('/room/ABC234'));
  });
});

describe('join room', () => {
  beforeEach(() => useAuthStore.getState().setAuth(guestAuth));

  it('validates the code format', async () => {
    renderAt('/join');
    await userEvent.type(screen.getByLabelText(/room code or invite link/i), 'nope');
    await userEvent.click(screen.getByRole('button', { name: /join game/i }));
    expect(await screen.findByText(/6-character code/i)).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it('shows server errors such as an unknown room', async () => {
    const { ApiError } = await import('../../lib/errors');
    request.mockRejectedValue(new ApiError('ROOM_NOT_FOUND'));
    renderAt('/join');
    await userEvent.type(screen.getByLabelText(/room code or invite link/i), 'ZZZ-ZZZ');
    await userEvent.click(screen.getByRole('button', { name: /join game/i }));
    expect(await screen.findByText(/that room does not exist/i)).toBeInTheDocument();
  });

  it('rejects full rooms', async () => {
    request.mockResolvedValue({
      roomCode: 'ABC234',
      status: 'IN_PROGRESS',
      joinable: false,
      isMember: false,
    });
    renderAt('/join');
    await userEvent.type(screen.getByLabelText(/room code or invite link/i), 'ABC234');
    await userEvent.click(screen.getByRole('button', { name: /join game/i }));
    expect(await screen.findByText(/already started/i)).toBeInTheDocument();
  });

  it('accepts an invite link and joins', async () => {
    request.mockImplementation(async (event: string) =>
      event === 'room:preview'
        ? { roomCode: 'ABC234', status: 'WAITING_FOR_PLAYER', joinable: true, isMember: false }
        : { snapshot: snapshot() },
    );
    const router = renderAt('/join');
    await userEvent.type(
      screen.getByLabelText(/room code or invite link/i),
      'http://localhost:5173/room/abc234',
    );
    await userEvent.click(screen.getByRole('button', { name: /join game/i }));
    await waitFor(() => expect(request).toHaveBeenCalledWith('room:join', { roomCode: 'ABC234' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/room/ABC234'));
  });
});

describe('not found', () => {
  it('renders a friendly 404', () => {
    renderAt('/does-not-exist');
    expect(screen.getByRole('heading', { name: /this square is empty/i })).toBeInTheDocument();
  });
});
