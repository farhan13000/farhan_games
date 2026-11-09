import {
  applyMove,
  createInitialGameState,
  type AuthPayload,
  type GameType,
  type PlayerSnapshot,
  type RoomSnapshot,
} from '@arena/shared';

export const ME = 'p:me';
export const OPP = 'p:opp';

export function player(overrides: Partial<PlayerSnapshot> = {}): PlayerSnapshot {
  return {
    playerId: ME,
    displayName: 'Hana',
    mark: 'X',
    connected: true,
    isHost: true,
    wins: 0,
    ...overrides,
  };
}

export function snapshot(
  overrides: Partial<RoomSnapshot> = {},
  gameType: GameType = 'tic-tac-toe',
): RoomSnapshot {
  return {
    roomCode: 'ABC234',
    gameType,
    status: 'READY',
    hostPlayerId: ME,
    players: [player(), player({ playerId: OPP, displayName: 'Gus', mark: 'O', isHost: false })],
    game: createInitialGameState(gameType),
    roundNumber: 1,
    roundVersion: 1,
    rematchVotes: [],
    nextGameType: gameType,
    draws: 0,
    stateVersion: 3,
    endReason: null,
    expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    createdAt: new Date().toISOString(),
    reconnectGraceSeconds: 90,
    ...overrides,
  };
}

/** A completed tic-tac-toe round won by X (the local player by default). */
export function completedSnapshot(overrides: Partial<RoomSnapshot> = {}): RoomSnapshot {
  let game = createInitialGameState('tic-tac-toe');
  for (const idx of [0, 3, 1, 4, 2]) game = applyMove(game, idx, game.currentTurn);
  return snapshot({ status: 'COMPLETED', game, ...overrides });
}

export const NAMES = { X: 'Hana', O: 'Gus' } as const;

export const guestAuth: AuthPayload = {
  accessToken: 'token',
  expiresIn: 900,
  profile: { playerId: ME, displayName: 'Hana' },
  features: { chat: true },
};
