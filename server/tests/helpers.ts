import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { io as ioClient, type Socket } from 'socket.io-client';
import request from 'supertest';
import { inject } from 'vitest';
import type { Ack, AuthPayload, GameType, RoomSnapshot } from '@arena/shared';
import { ensureIndexes } from '../src/config/db';
import { loadConfig, type AppConfig } from '../src/config/env';
import { createArenaServer, type ServerOptions } from '../src/createServer';

export function testConfig(overrides: Record<string, string> = {}): AppConfig {
  return loadConfig({
    NODE_ENV: 'test',
    MONGODB_URI: 'provided-by-tests',
    JWT_ACCESS_SECRET: 'test-access-secret-0123456789-abcdefghijklmnop',
    SESSION_SECRET: 'test-session-secret-0123456789-abcdefghijklmno',
    RATE_LIMIT_ENABLED: 'false',
    CLIENT_ORIGIN: 'http://localhost:5173',
    PLAYER_RECONNECT_GRACE_SECONDS: '30',
    ...overrides,
  });
}

export async function connectTestDb(): Promise<void> {
  await mongoose.connect(inject('mongoUri'), { dbName: `test_${randomUUID().slice(0, 8)}` });
  await ensureIndexes();
}

export async function disconnectTestDb(): Promise<void> {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

export async function startTestServer(config = testConfig(), options: ServerOptions = {}) {
  const server = createArenaServer(config, { sweeper: false, ...options });
  const port = await server.start(0);
  return { server, url: `http://127.0.0.1:${port}`, config };
}

export async function createGuest(
  url: string,
  displayName: string,
): Promise<AuthPayload & { cookie: string }> {
  const res = await request(url)
    .post('/api/session')
    .set('X-Arena-Client', '1')
    .send({ displayName })
    .expect(201);
  const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? [])[0]!.split(';')[0]!;
  return { ...(res.body.data as AuthPayload), cookie };
}

export async function refreshToken(url: string, cookie: string): Promise<AuthPayload | null> {
  const res = await request(url)
    .post('/api/session/refresh')
    .set('X-Arena-Client', '1')
    .set('Cookie', cookie);
  return res.body.data;
}

interface Recorded {
  event: string;
  payload: unknown;
  consumed: boolean;
}

export interface TestClient {
  socket: Socket;
  emit<T>(event: string, payload: unknown): Promise<Ack<T>>;
  waitFor<T>(event: string, predicate?: (payload: T) => boolean, timeoutMs?: number): Promise<T>;
  close(): void;
}

export async function connectClient(url: string, token: string): Promise<TestClient> {
  const socket = ioClient(url, {
    auth: { token },
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });
  const recorded: Recorded[] = [];
  const waiters = new Set<() => void>();
  socket.onAny((event: string, payload: unknown) => {
    recorded.push({ event, payload, consumed: false });
    waiters.forEach((w) => w());
  });

  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', (err) => reject(err));
  });

  return {
    socket,
    emit: <T>(event: string, payload: unknown) =>
      socket.timeout(5000).emitWithAck(event, payload) as Promise<Ack<T>>,
    waitFor<T>(event: string, predicate: (p: T) => boolean = () => true, timeoutMs = 5000) {
      return new Promise<T>((resolve, reject) => {
        const check = () => {
          const hit = recorded.find(
            (r) => !r.consumed && r.event === event && predicate(r.payload as T),
          );
          if (!hit) return false;
          hit.consumed = true;
          waiters.delete(check);
          clearTimeout(timer);
          resolve(hit.payload as T);
          return true;
        };
        const timer = setTimeout(() => {
          waiters.delete(check);
          reject(new Error(`Timed out waiting for "${event}"`));
        }, timeoutMs);
        if (!check()) waiters.add(check);
      });
    },
    close: () => {
      socket.disconnect();
    },
  };
}

export function expectOk<T>(ack: Ack<T>): T {
  if (!ack.ok) throw new Error(`Expected ok ack, got ${ack.error.code}: ${ack.error.message}`);
  return ack.data;
}

export async function setupMatch(url: string, gameType: GameType = 'tic-tac-toe') {
  const hostAuth = await createGuest(url, 'Host Hana');
  const guestAuth = await createGuest(url, 'Guest Gus');
  const host = await connectClient(url, hostAuth.accessToken);
  const guest = await connectClient(url, guestAuth.accessToken);
  const created = expectOk(
    await host.emit<{ snapshot: RoomSnapshot }>('room:create', { gameType }),
  );
  const roomCode = created.snapshot.roomCode;
  const joined = expectOk(await guest.emit<{ snapshot: RoomSnapshot }>('room:join', { roomCode }));
  return { host, guest, hostAuth, guestAuth, roomCode, snapshot: joined.snapshot };
}

let moveCounter = 0;
export function move(roomCode: string, snapshot: RoomSnapshot, index: number, moveId?: string) {
  return {
    roomCode,
    roundVersion: snapshot.roundVersion,
    expectedStep: snapshot.game.step,
    moveId: moveId ?? `move-${Date.now()}-${moveCounter++}`,
    index,
  };
}
