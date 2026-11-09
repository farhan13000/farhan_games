import { createServer as createHttpServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';
import { createApp } from './app';
import type { AppConfig } from './config/env';
import { RoomService } from './services/rooms/roomService';
import type { CodeGenerator } from './services/rooms/roomCode';
import { attachSockets, type ArenaServer } from './sockets';
import { logger } from './utils/logger';

export interface ArenaServerHandle {
  app: Express;
  httpServer: HttpServer;
  io: ArenaServer;
  roomService: RoomService;
  /** Recovers persisted rooms, starts listening and starts the room sweeper. */
  start(port?: number): Promise<number>;
  stop(): Promise<void>;
}

export interface ServerOptions {
  codeGenerator?: CodeGenerator;
  now?: () => Date;
  /** Disable the periodic sweeper (tests call roomService.sweep() directly). */
  sweeper?: boolean;
}

/** Wires Express + Socket.IO on one HTTP server. The DB connection is managed by the caller. */
export function createArenaServer(
  config: AppConfig,
  options: ServerOptions = {},
): ArenaServerHandle {
  const app = createApp(config);
  const httpServer = createHttpServer(app);
  const roomService = new RoomService({
    policy: config,
    logger,
    codeGenerator: options.codeGenerator,
    now: options.now,
  });
  const io = attachSockets(httpServer, config, roomService);
  let sweepTimer: NodeJS.Timeout | null = null;
  let sweeping = false;

  return {
    app,
    httpServer,
    io,
    roomService,

    async start(port = config.port) {
      await roomService.recoverAfterRestart();
      await new Promise<void>((resolve, reject) => {
        httpServer.once('error', reject);
        httpServer.listen(port, () => resolve());
      });
      if (options.sweeper !== false) {
        sweepTimer = setInterval(() => {
          if (sweeping) return;
          sweeping = true;
          roomService
            .sweep()
            .catch((err) => logger.error({ err }, 'Sweeper failed'))
            .finally(() => (sweeping = false));
        }, config.sweepIntervalMs);
        sweepTimer.unref();
      }
      return (httpServer.address() as AddressInfo).port;
    },

    async stop() {
      if (sweepTimer) clearInterval(sweepTimer);
      io.disconnectSockets(true);
      await new Promise<void>((resolve) => io.close(() => resolve()));
      if (httpServer.listening) {
        await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      }
    },
  };
}
