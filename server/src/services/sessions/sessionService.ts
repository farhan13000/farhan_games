import { EventEmitter } from 'node:events';
import { PlayerSession, type PlayerSessionDoc } from '../../models/PlayerSession';
import { hmacSha256, newId, randomToken, safeEqualHex } from '../../utils/crypto';
import type { PlayerIdentity } from '../rooms/types';

/** Emits `revoked(sessionId)` so the socket layer can disconnect revoked sessions. */
export const sessionEvents = new EventEmitter();

export interface SessionConfig {
  sessionSecret: string;
  sessionTtlMs: number;
}

export interface CreatedSession {
  session: PlayerSessionDoc;
  /** Raw cookie value `<sessionId>.<secret>`; never persisted. */
  cookieValue: string;
}

export async function createSession(
  cfg: SessionConfig,
  displayName: string,
): Promise<CreatedSession> {
  const sessionId = newId();
  const secret = randomToken(32);
  const doc = await PlayerSession.create({
    sessionId,
    tokenHash: hmacSha256(cfg.sessionSecret, secret),
    displayName,
    expiresAt: new Date(Date.now() + cfg.sessionTtlMs),
  });
  return { session: doc.toObject() as PlayerSessionDoc, cookieValue: `${sessionId}.${secret}` };
}

/** Verifies a cookie value in constant time and slides the expiry. */
export async function resolveSessionCookie(
  cfg: SessionConfig,
  cookieValue: string | undefined,
): Promise<PlayerSessionDoc | null> {
  if (!cookieValue || cookieValue.length > 200) return null;
  const [sessionId, secret] = cookieValue.split('.');
  if (!sessionId || !secret) return null;

  const session = await PlayerSession.findOne({ sessionId })
    .select('+tokenHash')
    .lean<PlayerSessionDoc>()
    .exec();
  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return null;
  if (!safeEqualHex(session.tokenHash, hmacSha256(cfg.sessionSecret, secret))) return null;

  const now = Date.now();
  // Sliding expiration: extend once less than half of the TTL remains.
  if (session.expiresAt.getTime() - now < cfg.sessionTtlMs / 2) {
    session.expiresAt = new Date(now + cfg.sessionTtlMs);
    await PlayerSession.updateOne(
      { sessionId },
      { $set: { expiresAt: session.expiresAt, lastSeenAt: new Date(now) } },
    ).exec();
  }
  return session;
}

/** Returns the session if it is still valid (used on every authenticated request/socket). */
export async function findActiveSession(sessionId: string): Promise<PlayerSessionDoc | null> {
  const session = await PlayerSession.findOne({ sessionId }).lean<PlayerSessionDoc>().exec();
  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return null;
  return session;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await PlayerSession.updateOne({ sessionId }, { $set: { revokedAt: new Date() } }).exec();
  sessionEvents.emit('revoked', sessionId);
}

export function playerIdFor(session: Pick<PlayerSessionDoc, 'sessionId'>): string {
  return `p:${session.sessionId}`;
}

export function identityForSession(session: PlayerSessionDoc): PlayerIdentity {
  return {
    sessionId: session.sessionId,
    playerId: playerIdFor(session),
    displayName: session.displayName,
  };
}
