import { describe, expect, it } from 'vitest';
import { ROOM_CODE_ALPHABET } from '@arena/shared';
import { ConfigError, durationToSeconds, loadConfig } from '../../src/config/env';
import { generateRoomCode, withUniqueRoomCode } from '../../src/services/rooms/roomCode';
import { KeyedMutex } from '../../src/services/rooms/roomLock';

const base = {
  MONGODB_URI: 'mongodb://localhost/test',
  JWT_ACCESS_SECRET: 'a'.repeat(40),
  SESSION_SECRET: 'b'.repeat(40),
};

describe('loadConfig', () => {
  it('applies documented defaults', () => {
    const cfg = loadConfig(base);
    expect(cfg.roomWaitingTtlMs).toBe(30 * 60_000);
    expect(cfg.reconnectGraceMs).toBe(90_000);
    expect(cfg.accessTokenTtlSeconds).toBe(900);
    expect(cfg.clientOrigins).toEqual(['http://localhost:5173']);
  });

  it('fails clearly when required variables are missing', () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    expect(() => loadConfig({ ...base, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects unsafe production settings', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production', MONGODB_URI: 'memory' })).toThrow(
      /memory/,
    );
    expect(() =>
      loadConfig({
        ...base,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'replace_with_' + 'x'.repeat(30),
      }),
    ).toThrow(/placeholder/);
    expect(() => loadConfig({ ...base, COOKIE_SAMESITE: 'none', COOKIE_SECURE: 'false' })).toThrow(
      /SAMESITE/,
    );
  });

  it('parses durations', () => {
    expect(durationToSeconds('15m')).toBe(900);
    expect(durationToSeconds('2h')).toBe(7200);
  });
});

describe('room codes', () => {
  it('generates readable 6-character codes', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode();
      expect(code).toHaveLength(6);
      for (const ch of code) expect(ROOM_CODE_ALPHABET).toContain(ch);
    }
  });

  it('retries on a duplicate-key collision', async () => {
    const codes = ['AAAAAA', 'AAAAAA', 'BBBBBB'];
    const taken = new Set<string>(['AAAAAA']);
    const result = await withUniqueRoomCode(
      async (code) => {
        if (taken.has(code))
          throw Object.assign(new Error('dup'), { code: 11000, keyPattern: { roomCode: 1 } });
        return code;
      },
      () => codes.shift()!,
    );
    expect(result).toBe('BBBBBB');
  });

  it('gives up after too many collisions and rethrows unrelated errors', async () => {
    const dup = () =>
      Promise.reject(Object.assign(new Error('dup'), { code: 11000, keyPattern: { roomCode: 1 } }));
    await expect(withUniqueRoomCode(dup, () => 'AAAAAA', 3)).rejects.toThrow(/room code/);
    await expect(withUniqueRoomCode(() => Promise.reject(new Error('boom')))).rejects.toThrow(
      'boom',
    );
  });
});

describe('KeyedMutex', () => {
  it('serializes tasks per key', async () => {
    const mutex = new KeyedMutex();
    const order: string[] = [];
    const slow = mutex.run('room', async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push('first');
    });
    const fast = mutex.run('room', async () => {
      order.push('second');
    });
    await Promise.all([slow, fast]);
    expect(order).toEqual(['first', 'second']);
  });
});
