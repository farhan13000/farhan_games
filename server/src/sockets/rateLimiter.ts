/** Fixed-window per-key counter used to throttle socket events per player. */
export class SocketRateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly enabled: boolean) {}

  allow(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
    if (!this.enabled) return true;
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + windowMs });
      if (this.hits.size > 10_000) this.prune(now);
      return true;
    }
    entry.count++;
    return entry.count <= limit;
  }

  private prune(now: number): void {
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
  }
}

/** Limits per event category: [max events, window ms]. */
export const SOCKET_LIMITS = {
  create: [10, 60_000],
  join: [30, 60_000],
  move: [30, 10_000],
  rematch: [20, 60_000],
  chat: [8, 10_000],
  reaction: [10, 10_000],
  default: [60, 60_000],
} as const satisfies Record<string, readonly [number, number]>;

export type SocketLimitKey = keyof typeof SOCKET_LIMITS;
