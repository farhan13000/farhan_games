import {
  SOCKET_ACK_TIMEOUT_MS,
  type Ack,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@arena/shared';
import { io, type Socket } from 'socket.io-client';
import { create } from 'zustand';
import { useAuthStore } from '../store/authStore';
import { refreshSession } from './api';
import { config } from './config';
import { ApiError } from './errors';

export type ArenaSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';

export const useConnectionStore = create<{ status: ConnectionStatus }>(() => ({ status: 'idle' }));
const setStatus = (status: ConnectionStatus) => useConnectionStore.setState({ status });

async function freshToken(): Promise<string | null> {
  const { accessToken, expiresAt } = useAuthStore.getState();
  if (accessToken && expiresAt - Date.now() > 30_000) return accessToken;
  const refreshed = await refreshSession().catch(() => null);
  return refreshed?.accessToken ?? null;
}

type EmitWithAck = { emitWithAck(event: string, payload: unknown): Promise<unknown> };

/**
 * Owns the single Socket.IO connection for the signed-in identity. Created lazily,
 * reused across renders/pages, re-created only when the identity changes.
 */
class SocketManager {
  private socket: ArenaSocket | null = null;
  private playerId: string | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  get current(): ArenaSocket | null {
    return this.socket;
  }

  ensure(): ArenaSocket {
    const { status, profile } = useAuthStore.getState();
    if (status !== 'authenticated' || !profile) throw new ApiError('UNAUTHORIZED');
    if (this.socket && this.playerId === profile.playerId) {
      if (!this.socket.connected && !this.socket.active) this.socket.connect();
      return this.socket;
    }
    this.disconnect();
    this.playerId = profile.playerId;

    const socket: ArenaSocket = io(config.socketUrl, {
      autoConnect: false,
      withCredentials: true,
      // Called on every (re)connection attempt, so reconnects always use a fresh token.
      auth: (cb) => {
        void freshToken().then((token) => cb({ token }));
      },
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      timeout: 8000,
    });

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') setStatus('idle');
      else if (reason === 'io server disconnect') setStatus('offline');
      else setStatus('reconnecting');
    });
    socket.io.on('reconnect_attempt', () => setStatus('reconnecting'));
    socket.io.on('reconnect_failed', () => setStatus('offline'));
    socket.on('connect_error', async (err) => {
      if (socket.active) {
        setStatus('reconnecting'); // transport problem: Socket.IO retries automatically
        return;
      }
      // Rejected by the server's auth middleware: refresh credentials, then retry.
      setStatus('reconnecting');
      const code = (err as Error & { data?: { code?: string } }).data?.code ?? err.message;
      if (code === 'UNAUTHORIZED' || code === 'SESSION_EXPIRED') {
        const refreshed = await refreshSession().catch(() => null);
        if (!refreshed) {
          setStatus('offline');
          return;
        }
      }
      this.retryTimer = setTimeout(() => socket.connect(), 1500);
    });

    this.socket = socket;
    setStatus('connecting');
    socket.connect();
    return socket;
  }

  /** Reconnect promptly when the tab wakes up or the network returns. */
  nudge(): void {
    if (this.socket && !this.socket.connected) {
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.socket.connect();
    }
  }

  disconnect(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.socket?.removeAllListeners();
    this.socket?.io.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.playerId = null;
    setStatus('idle');
  }

  /** Emits an event and resolves with the ack `data`, or throws ApiError. */
  async request<T>(event: keyof ClientToServerEvents, payload: unknown): Promise<T> {
    const socket = this.ensure();
    let res: Ack<T>;
    try {
      res = (await (socket.timeout(SOCKET_ACK_TIMEOUT_MS) as unknown as EmitWithAck).emitWithAck(
        event,
        payload,
      )) as Ack<T>;
    } catch {
      throw new ApiError('TIMEOUT');
    }
    if (!res.ok) throw new ApiError(res.error.code, res.error.message, res.error.details);
    return res.data;
  }
}

export const socketManager = new SocketManager();
