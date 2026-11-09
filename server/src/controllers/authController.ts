import type { CookieOptions, Request, Response } from 'express';
import type { ApiSuccess, AuthPayload } from '@arena/shared';
import type { AppConfig } from '../config/env';
import { signAccessToken } from '../services/auth/tokens';
import type { PlayerIdentity } from '../services/rooms/types';
import {
  createSession,
  identityForSession,
  resolveSessionCookie,
  revokeSession,
} from '../services/sessions/sessionService';
import { AppError } from '../utils/AppError';

export const SESSION_COOKIE = 'ta_session';

export function buildAuthPayload(config: AppConfig, identity: PlayerIdentity): AuthPayload {
  return {
    accessToken: signAccessToken(config, { sid: identity.sessionId }),
    expiresIn: config.accessTokenTtlSeconds,
    profile: { playerId: identity.playerId, displayName: identity.displayName },
    features: { chat: config.features.chat },
  };
}

/**
 * No accounts: a visitor picks a display name and gets an anonymous session,
 * remembered by an HttpOnly cookie so refreshes keep the same player identity.
 */
export function createSessionController(config: AppConfig) {
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: '/api/session',
    maxAge: config.sessionTtlMs,
  };

  const setCookie = (res: Response, value: string) =>
    res.cookie(SESSION_COOKIE, value, cookieOptions);
  const clearCookie = (res: Response) =>
    res.clearCookie(SESSION_COOKIE, { ...cookieOptions, maxAge: undefined });
  const send = (res: Response, payload: AuthPayload | null, status = 200) => {
    const body: ApiSuccess<AuthPayload | null> = { ok: true, data: payload };
    res.status(status).json(body);
  };

  return {
    /** Starts a new player session with the given display name (replaces any previous one). */
    async start(req: Request, res: Response) {
      const previous = await resolveSessionCookie(config, req.cookies?.[SESSION_COOKIE]);
      if (previous) await revokeSession(previous.sessionId);
      const { session, cookieValue } = await createSession(config, req.body.displayName);
      setCookie(res, cookieValue);
      send(res, buildAuthPayload(config, identityForSession(session)), 201);
    },

    /** Exchanges the HttpOnly session cookie for a fresh access token; `null` if none. */
    async refresh(req: Request, res: Response) {
      const session = await resolveSessionCookie(config, req.cookies?.[SESSION_COOKIE]);
      if (!session) {
        if (req.cookies?.[SESSION_COOKIE]) clearCookie(res);
        send(res, null);
        return;
      }
      setCookie(res, req.cookies[SESSION_COOKIE]); // refresh cookie max-age (sliding)
      send(res, buildAuthPayload(config, identityForSession(session)));
    },

    /** Forgets this browser's player identity. */
    async end(req: Request, res: Response) {
      const session = await resolveSessionCookie(config, req.cookies?.[SESSION_COOKIE]);
      if (session) await revokeSession(session.sessionId);
      clearCookie(res);
      res.json({ ok: true, data: { ended: true } });
    },

    async me(req: Request, res: Response) {
      const identity = req.identity;
      if (!identity) throw new AppError('UNAUTHORIZED');
      res.json({
        ok: true,
        data: { playerId: identity.playerId, displayName: identity.displayName },
      });
    },
  };
}
