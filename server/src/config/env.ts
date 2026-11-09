import { z } from 'zod';

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(0).max(65535).default(5000),
  /** Comma-separated allowlist of browser origins. */
  CLIENT_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  /** A MongoDB connection string, or `memory` for an ephemeral in-memory DB (dev/test only). */
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'Use a duration like 15m, 1h or 900s')
    .default('15m'),
  /** HMAC key used to hash session secrets before they are stored. */
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_SECURE: bool.optional(),
  ROOM_WAITING_TTL_MINUTES: z.coerce.number().int().min(1).max(1440).default(30),
  ROOM_IDLE_TTL_MINUTES: z.coerce.number().int().min(1).max(1440).default(120),
  PLAYER_RECONNECT_GRACE_SECONDS: z.coerce.number().int().min(5).max(3600).default(90),
  ROOM_SWEEP_INTERVAL_SECONDS: z.coerce.number().int().min(1).max(600).default(10),
  ENDED_ROOM_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(7),
  CHAT_ENABLED: bool.default('true'),
  RATE_LIMIT_ENABLED: bool.default('true'),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export interface AppConfig {
  env: Env['NODE_ENV'];
  isProduction: boolean;
  port: number;
  clientOrigins: string[];
  mongoUri: string;
  jwtAccessSecret: string;
  jwtAccessExpiresIn: string;
  accessTokenTtlSeconds: number;
  sessionSecret: string;
  sessionTtlMs: number;
  cookie: { sameSite: 'lax' | 'strict' | 'none'; secure: boolean };
  roomWaitingTtlMs: number;
  roomIdleTtlMs: number;
  reconnectGraceMs: number;
  sweepIntervalMs: number;
  endedRoomRetentionMs: number;
  features: { chat: boolean };
  rateLimitEnabled: boolean;
  trustProxy: number;
  logLevel: Env['LOG_LEVEL'];
}

export class ConfigError extends Error {
  constructor(issues: string[]) {
    super(`Invalid server configuration:\n  - ${issues.join('\n  - ')}`);
    this.name = 'ConfigError';
  }
}

export function durationToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new ConfigError([`Invalid duration "${value}"`]);
  const factor = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return Number(match[1]) * factor;
}

const PLACEHOLDER = /replace_with|changeme|example/i;

/** Validates environment variables and derives a typed configuration. Throws ConfigError. */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }
  const e = parsed.data;
  const isProduction = e.NODE_ENV === 'production';

  const problems: string[] = [];
  if (isProduction) {
    if (e.MONGODB_URI === 'memory')
      problems.push('MONGODB_URI=memory is not allowed in production');
    if (PLACEHOLDER.test(e.JWT_ACCESS_SECRET)) problems.push('JWT_ACCESS_SECRET is a placeholder');
    if (PLACEHOLDER.test(e.SESSION_SECRET)) problems.push('SESSION_SECRET is a placeholder');
    if (e.JWT_ACCESS_SECRET === e.SESSION_SECRET)
      problems.push('JWT_ACCESS_SECRET and SESSION_SECRET must differ');
  }
  const secure = e.COOKIE_SECURE ?? isProduction;
  if (e.COOKIE_SAMESITE === 'none' && !secure) {
    problems.push('COOKIE_SAMESITE=none requires COOKIE_SECURE=true');
  }
  if (problems.length) throw new ConfigError(problems);

  return {
    env: e.NODE_ENV,
    isProduction,
    port: e.PORT,
    clientOrigins: e.CLIENT_ORIGIN.split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean),
    mongoUri: e.MONGODB_URI,
    jwtAccessSecret: e.JWT_ACCESS_SECRET,
    jwtAccessExpiresIn: e.JWT_ACCESS_EXPIRES_IN,
    accessTokenTtlSeconds: durationToSeconds(e.JWT_ACCESS_EXPIRES_IN),
    sessionSecret: e.SESSION_SECRET,
    sessionTtlMs: e.SESSION_TTL_DAYS * 86_400_000,
    cookie: { sameSite: e.COOKIE_SAMESITE, secure },
    roomWaitingTtlMs: e.ROOM_WAITING_TTL_MINUTES * 60_000,
    roomIdleTtlMs: e.ROOM_IDLE_TTL_MINUTES * 60_000,
    reconnectGraceMs: e.PLAYER_RECONNECT_GRACE_SECONDS * 1000,
    sweepIntervalMs: e.ROOM_SWEEP_INTERVAL_SECONDS * 1000,
    endedRoomRetentionMs: e.ENDED_ROOM_RETENTION_DAYS * 86_400_000,
    features: { chat: e.CHAT_ENABLED },
    rateLimitEnabled: e.RATE_LIMIT_ENABLED,
    trustProxy: e.TRUST_PROXY,
    logLevel: e.LOG_LEVEL,
  };
}
