import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AppConfig } from '../config/env';
import { verifyAccessToken } from '../services/auth/tokens';
import type { PlayerIdentity } from '../services/rooms/types';
import { findActiveSession, identityForSession } from '../services/sessions/sessionService';
import { AppError } from '../utils/AppError';
import { asyncHandler } from './asyncHandler';

declare module 'express-serve-static-core' {
  interface Request {
    identity?: PlayerIdentity;
  }
}

export function bearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 && token.length < 2048 ? token : null;
}

/** Resolves an access token to a live session identity (revocation is checked every time). */
export async function authenticateToken(
  config: AppConfig,
  token: string | null,
): Promise<PlayerIdentity> {
  if (!token) throw new AppError('UNAUTHORIZED');
  const { sid } = verifyAccessToken(config, token);
  const session = await findActiveSession(sid);
  if (!session) throw new AppError('SESSION_EXPIRED');
  return identityForSession(session);
}

export function requireAuth(config: AppConfig): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    req.identity = await authenticateToken(config, bearerToken(req.headers.authorization));
    next();
  });
}

/**
 * CSRF defence for cookie-authenticated endpoints: browsers cannot attach a custom
 * header cross-origin without a CORS preflight, which our allowlist rejects.
 */
export function requireClientHeader(req: Request, _res: Response, next: NextFunction): void {
  if (req.method !== 'GET' && req.get('X-Arena-Client') !== '1') {
    next(new AppError('FORBIDDEN', 'Missing client header.'));
    return;
  }
  next();
}
