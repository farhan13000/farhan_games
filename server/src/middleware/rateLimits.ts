import rateLimit from 'express-rate-limit';
import { ERROR_MESSAGES, type ApiFailure } from '@arena/shared';
import type { AppConfig } from '../config/env';

function limiter(config: AppConfig, windowMs: number, limit: number) {
  const body: ApiFailure = {
    ok: false,
    error: { code: 'RATE_LIMITED', message: ERROR_MESSAGES.RATE_LIMITED },
  };
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => !config.rateLimitEnabled,
    handler: (_req, res) => {
      res.status(429).json(body);
    },
  });
}

export function createRateLimiters(config: AppConfig) {
  return {
    /** Starting a new player session (choosing a name). */
    session: limiter(config, 15 * 60_000, 30),
    refresh: limiter(config, 15 * 60_000, 300),
    api: limiter(config, 60_000, 300),
  };
}
