import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { S2C, type ClientToServerEvents, type ServerToClientEvents } from '@arena/shared';
import type { AppConfig } from '../config/env';
import { authenticateToken } from '../middleware/auth';
import type { RoomBroadcaster, RoomService } from '../services/rooms/roomService';
import type { PlayerIdentity, RoomRecord } from '../services/rooms/types';
import { sessionEvents } from '../services/sessions/sessionService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { ChatStore } from './chatStore';
import { registerHandlers } from './handlers';
import { PresenceTracker } from './presence';
import { SocketRateLimiter } from './rateLimiter';

export interface SocketData {
  identity: PlayerIdentity;
  rooms: Set<string>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ArenaServer = Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;

/** Private Socket.IO room for one player's sockets in one game room. */
export function viewerChannel(roomCode: string, playerId: string): string {
  return `${roomCode}#${playerId}`;
}

/**
 * State is sent to each member through their private channel, built for them,
 * so secrets (an opponent's locked-in pick, face-down cards) never leave the server.
 */
export function createBroadcaster(io: ArenaServer, roomService: RoomService): RoomBroadcaster {
  const perViewer = (event: typeof S2C.ROOM_STATE | typeof S2C.GAME_STATE, room: RoomRecord) => {
    for (const p of room.players) {
      io.to(viewerChannel(room.roomCode, p.playerId)).emit(
        event,
        roomService.snapshot(room, p.playerId),
      );
    }
  };
  return {
    roomState: (room) => perViewer(S2C.ROOM_STATE, room),
    gameState: (room) => perViewer(S2C.GAME_STATE, room),
    playerJoined: (p) => io.to(p.roomCode).emit(S2C.ROOM_PLAYER_JOINED, p),
    playerLeft: (p) => io.to(p.roomCode).emit(S2C.ROOM_PLAYER_LEFT, p),
    playerStatus: (p) => io.to(p.roomCode).emit(S2C.ROOM_PLAYER_STATUS, p),
    roundCompleted: (p) => io.to(p.roomCode).emit(S2C.GAME_ROUND_COMPLETED, p),
    rematchStatus: (p) => io.to(p.roomCode).emit(S2C.GAME_REMATCH_STATUS, p),
    roomClosed: (p) => io.to(p.roomCode).emit(S2C.ROOM_CLOSED, p),
  };
}

export function attachSockets(
  httpServer: HttpServer,
  config: AppConfig,
  roomService: RoomService,
): ArenaServer {
  const io: ArenaServer = new Server(httpServer, {
    cors: { origin: config.clientOrigins, credentials: true },
    maxHttpBufferSize: 16 * 1024,
    pingInterval: 20_000,
    pingTimeout: 20_000,
    serveClient: false,
  });

  // Handshake authentication: a valid access token bound to a live session is required.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      socket.data.identity = await authenticateToken(
        config,
        typeof token === 'string' ? token : null,
      );
      socket.data.rooms = new Set();
      next();
    } catch (err) {
      const appError = err instanceof AppError ? err : new AppError('UNAUTHORIZED');
      const error = new Error(appError.code) as Error & { data?: unknown };
      error.data = appError.toBody();
      next(error);
    }
  });

  roomService.broadcaster = createBroadcaster(io, roomService);
  const presence = new PresenceTracker();
  const limiter = new SocketRateLimiter(config.rateLimitEnabled);
  const chat = new ChatStore();

  const onRevoked = (sessionId: string) => {
    io.to(`session:${sessionId}`).emit(S2C.SESSION_ERROR, {
      code: 'SESSION_EXPIRED',
      message: 'You have been signed out.',
    });
    io.in(`session:${sessionId}`).disconnectSockets(true);
  };
  sessionEvents.on('revoked', onRevoked);
  httpServer.on('close', () => sessionEvents.off('revoked', onRevoked));

  io.on('connection', (socket) => {
    void socket.join(`session:${socket.data.identity.sessionId}`);
    logger.debug({ playerId: socket.data.identity.playerId }, 'socket connected');
    registerHandlers({ io, socket, config, roomService, presence, limiter, chat });
  });

  return io;
}
