import {
  C2S,
  ERROR_MESSAGES,
  S2C,
  chatSendSchema,
  createRoomSchema,
  makeMoveSchema,
  reactionSchema,
  rematchRequestSchema,
  rematchResponseSchema,
  roomRefSchema,
  type Ack,
  type ApiErrorBody,
  type ChatMessage,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@arena/shared';
import type { Socket } from 'socket.io';
import type { ZodTypeAny, z } from 'zod';
import type { AppConfig } from '../config/env';
import { zodDetails } from '../middleware/validate';
import type { RoomService } from '../services/rooms/roomService';
import { AppError } from '../utils/AppError';
import { newId } from '../utils/crypto';
import { logger } from '../utils/logger';
import type { ChatStore } from './chatStore';
import { viewerChannel, type ArenaServer, type SocketData } from './index';
import type { PresenceTracker } from './presence';
import { SOCKET_LIMITS, type SocketLimitKey, type SocketRateLimiter } from './rateLimiter';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ArenaSocket = Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>;
type UntypedOn = { on(event: string, listener: (...args: unknown[]) => void): void };

interface HandlerContext {
  io: ArenaServer;
  socket: ArenaSocket;
  config: AppConfig;
  roomService: RoomService;
  presence: PresenceTracker;
  limiter: SocketRateLimiter;
  chat: ChatStore;
}

function toErrorBody(err: unknown): ApiErrorBody {
  if (err instanceof AppError) return err.toBody();
  logger.error({ err }, 'Unhandled socket handler error');
  return { code: 'INTERNAL_ERROR', message: ERROR_MESSAGES.INTERNAL_ERROR };
}

export function registerHandlers(ctx: HandlerContext): void {
  const { io, config, roomService, presence, limiter, chat } = ctx;
  const socket = ctx.socket;
  const identity = socket.data.identity;

  /**
   * Registers an event with validation, rate limiting and a uniform ack envelope:
   * `{ ok: true, data }` or `{ ok: false, error: { code, message, details? } }`.
   */
  function on<S extends ZodTypeAny, R>(
    event: string,
    limitKey: SocketLimitKey,
    schema: S,
    handler: (payload: z.output<S>) => Promise<R>,
    onError?: (error: ApiErrorBody, payload: z.output<S> | null) => void,
  ) {
    (socket as unknown as UntypedOn).on(event, async (raw: unknown, ack: unknown) => {
      const reply = (typeof ack === 'function' ? ack : () => {}) as (res: Ack<R>) => void;
      const [limit, windowMs] = SOCKET_LIMITS[limitKey];
      if (!limiter.allow(`${identity.playerId}:${limitKey}`, limit, windowMs)) {
        reply({ ok: false, error: { code: 'RATE_LIMITED', message: ERROR_MESSAGES.RATE_LIMITED } });
        return;
      }
      const parsed = schema.safeParse(raw ?? {});
      if (!parsed.success) {
        const error: ApiErrorBody = {
          code: 'VALIDATION_ERROR',
          message: ERROR_MESSAGES.VALIDATION_ERROR,
          details: zodDetails(parsed.error.issues),
        };
        onError?.(error, null);
        reply({ ok: false, error });
        return;
      }
      try {
        reply({ ok: true, data: await handler(parsed.data) });
      } catch (err) {
        const error = toErrorBody(err);
        onError?.(error, parsed.data);
        reply({ ok: false, error });
      }
    });
  }

  function attachToRoom(roomCode: string) {
    void socket.join([roomCode, viewerChannel(roomCode, identity.playerId)]);
    socket.data.rooms.add(roomCode);
    presence.add(roomCode, identity.playerId, socket.id);
  }

  function requireJoined(roomCode: string) {
    if (!socket.data.rooms.has(roomCode)) throw new AppError('NOT_A_MEMBER');
  }

  on(C2S.ROOM_CREATE, 'create', createRoomSchema, async ({ gameType }) => {
    const snapshot = await roomService.createRoom(identity, gameType);
    attachToRoom(snapshot.roomCode);
    return { snapshot };
  });

  on(C2S.ROOM_PREVIEW, 'join', roomRefSchema, ({ roomCode }) =>
    roomService.preview(roomCode, identity),
  );

  on(C2S.ROOM_JOIN, 'join', roomRefSchema, async ({ roomCode }) => {
    const snapshot = await roomService.join(roomCode, identity);
    attachToRoom(roomCode);
    return { snapshot };
  });

  on(C2S.SESSION_RECONNECT, 'join', roomRefSchema, async ({ roomCode }) => {
    const snapshot = await roomService.reconnect(roomCode, identity);
    attachToRoom(roomCode);
    return { snapshot, chat: config.features.chat ? chat.history(roomCode) : [] };
  });

  on(C2S.ROOM_LEAVE, 'default', roomRefSchema, async ({ roomCode }) => {
    await roomService.leave(roomCode, identity);
    // Detach every socket (tab) of this player from the room.
    for (const socketId of presence.socketsOf(roomCode, identity.playerId)) {
      const s = io.sockets.sockets.get(socketId);
      s?.data.rooms.delete(roomCode);
      void s?.leave(roomCode);
      void s?.leave(viewerChannel(roomCode, identity.playerId));
    }
    presence.dropPlayer(roomCode, identity.playerId);
    socket.data.rooms.delete(roomCode);
    void socket.leave(roomCode);
    void socket.leave(viewerChannel(roomCode, identity.playerId));
    return { left: true as const };
  });

  on(
    C2S.GAME_MAKE_MOVE,
    'move',
    makeMoveSchema,
    async (p) => {
      const snapshot = await roomService.makeMove(p.roomCode, {
        playerId: identity.playerId,
        index: p.index,
        moveId: p.moveId,
        roundVersion: p.roundVersion,
        expectedStep: p.expectedStep,
      });
      return { snapshot };
    },
    (error, payload) => {
      void (async () => {
        const snapshot = payload
          ? await roomService
              .snapshotForMember(payload.roomCode, identity.playerId)
              .catch(() => null)
          : null;
        socket.emit(S2C.GAME_MOVE_REJECTED, { code: error.code, message: error.message, snapshot });
      })();
    },
  );

  on(C2S.GAME_REMATCH_REQUEST, 'rematch', rematchRequestSchema, async (p) => ({
    snapshot: await roomService.voteNext(
      p.roomCode,
      identity.playerId,
      p.roundVersion,
      true,
      p.gameType,
    ),
  }));

  on(C2S.GAME_REMATCH_RESPONSE, 'rematch', rematchResponseSchema, async (p) => ({
    snapshot: await roomService.voteNext(p.roomCode, identity.playerId, p.roundVersion, p.accept),
  }));

  on(C2S.CHAT_SEND, 'chat', chatSendSchema, async ({ roomCode, text }) => {
    if (!config.features.chat) throw new AppError('FEATURE_DISABLED');
    requireJoined(roomCode);
    const message: ChatMessage = {
      id: newId(),
      playerId: identity.playerId,
      displayName: identity.displayName,
      text,
      sentAt: new Date().toISOString(),
    };
    chat.add(roomCode, message);
    io.to(roomCode).emit(S2C.CHAT_MESSAGE, message);
    return { message };
  });

  on(C2S.REACTION_SEND, 'reaction', reactionSchema, async ({ roomCode, emoji }) => {
    requireJoined(roomCode);
    io.to(roomCode).emit(S2C.ROOM_REACTION, { id: newId(), playerId: identity.playerId, emoji });
    return { sent: true as const };
  });

  socket.on('disconnect', () => {
    for (const roomCode of socket.data.rooms) {
      if (presence.remove(roomCode, identity.playerId, socket.id)) {
        roomService
          .setPresence(roomCode, identity.playerId, false)
          .catch((err) => logger.warn({ err, roomCode }, 'Failed to record disconnect'));
      }
    }
  });
}
