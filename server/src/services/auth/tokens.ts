import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/AppError';

/** Claims inside the short-lived access token. Only the session id is authoritative. */
export interface AccessClaims {
  sid: string;
}

export interface TokenConfig {
  jwtAccessSecret: string;
  jwtAccessExpiresIn: string;
}

const ISSUER = 'tictac-arena';
const AUDIENCE = 'tictac-arena-client';

export function signAccessToken(cfg: TokenConfig, claims: AccessClaims): string {
  return jwt.sign(claims, cfg.jwtAccessSecret, {
    algorithm: 'HS256',
    expiresIn: cfg.jwtAccessExpiresIn as jwt.SignOptions['expiresIn'],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function verifyAccessToken(cfg: TokenConfig, token: string): AccessClaims {
  try {
    const payload = jwt.verify(token, cfg.jwtAccessSecret, {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload !== 'object' || typeof payload.sid !== 'string') {
      throw new AppError('UNAUTHORIZED');
    }
    return { sid: payload.sid };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) throw new AppError('SESSION_EXPIRED');
    throw new AppError('UNAUTHORIZED');
  }
}
