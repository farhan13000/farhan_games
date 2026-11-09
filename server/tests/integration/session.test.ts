import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PlayerSession } from '../../src/models/PlayerSession';
import {
  connectTestDb,
  createGuest,
  disconnectTestDb,
  refreshToken,
  startTestServer,
  testConfig,
} from '../helpers';

let url: string;
let stop: () => Promise<void>;

beforeAll(async () => {
  await connectTestDb();
  const started = await startTestServer();
  url = started.url;
  stop = () => started.server.stop();
});

afterAll(async () => {
  await stop();
  await disconnectTestDb();
});

const api = () => ({
  post: (path: string) => request(url).post(path).set('X-Arena-Client', '1'),
  get: (path: string) => request(url).get(path),
});

describe('health', () => {
  it('reports database status', async () => {
    const res = await api().get('/api/health').expect(200);
    expect(res.body).toMatchObject({ ok: true, data: { status: 'ok', db: 'up' } });
  });

  it('returns the standard envelope for unknown routes', async () => {
    const res = await api().get('/api/nope').expect(404);
    expect(res.body).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: expect.any(String) },
    });
  });

  it('has no account endpoints', async () => {
    await api().post('/api/auth/login').send({}).expect(404);
    await api().post('/api/auth/register').send({}).expect(404);
    await api().get('/api/matches').expect(404);
  });
});

describe('anonymous player sessions', () => {
  it('creates a session from just a name, with an HttpOnly cookie and an access token', async () => {
    const res = await api()
      .post('/api/session')
      .send({ displayName: '  Pixel  Pirate ' })
      .expect(201);
    expect(res.body.data.profile).toEqual({
      playerId: expect.stringMatching(/^p:/),
      displayName: 'Pixel Pirate',
    });
    const setCookie = String(res.headers['set-cookie']);
    expect(setCookie).toMatch(/ta_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    // The raw secret is never stored.
    const sessionId = res.body.data.profile.playerId.slice(2);
    const stored = await PlayerSession.findOne({ sessionId }).select('+tokenHash').lean();
    expect(stored?.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(setCookie).not.toContain(stored!.tokenHash);
  });

  it('keeps the same identity across refreshes (page reload)', async () => {
    const guest = await createGuest(url, 'Reload Ray');
    const refreshed = await refreshToken(url, guest.cookie);
    expect(refreshed?.profile.playerId).toBe(guest.profile.playerId);
  });

  it('returns null for missing or tampered sessions', async () => {
    expect((await api().post('/api/session/refresh').expect(200)).body.data).toBeNull();
    const guest = await createGuest(url, 'Tamper Tom');
    const [sid] = guest.cookie.replace('ta_session=', '').split('.');
    expect(await refreshToken(url, `ta_session=${sid}.forged-secret`)).toBeNull();
  });

  it('expires sessions after their TTL', async () => {
    const guest = await createGuest(url, 'Expiring Eve');
    await PlayerSession.updateOne(
      { sessionId: guest.profile.playerId.slice(2) },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
    expect(await refreshToken(url, guest.cookie)).toBeNull();
    const me = await api()
      .get('/api/session/me')
      .set('Authorization', `Bearer ${guest.accessToken}`);
    expect(me.status).toBe(401);
    expect(me.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('ends a session ("forget me") and revokes its tokens immediately', async () => {
    const guest = await createGuest(url, 'Leaving Lou');
    await api()
      .get('/api/session/me')
      .set('Authorization', `Bearer ${guest.accessToken}`)
      .expect(200);
    await api().post('/api/session/end').set('Cookie', guest.cookie).expect(200);
    expect(await refreshToken(url, guest.cookie)).toBeNull();
    await api()
      .get('/api/session/me')
      .set('Authorization', `Bearer ${guest.accessToken}`)
      .expect(401);
  });

  it('validates display names', async () => {
    const res = await api().post('/api/session').send({ displayName: '<b>x</b>' }).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].field).toBe('displayName');
  });

  it('requires the client header on cookie endpoints (CSRF defence)', async () => {
    const res = await request(url)
      .post('/api/session')
      .send({ displayName: 'No Header' })
      .expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects oversized payloads safely', async () => {
    const res = await api()
      .post('/api/session')
      .send({ displayName: 'x'.repeat(20_000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('rate limiting', () => {
  it('limits rapid session creation', async () => {
    const limited = await startTestServer(testConfig({ RATE_LIMIT_ENABLED: 'true' }));
    try {
      let last = 0;
      for (let i = 0; i < 32; i++) {
        const res = await request(limited.url)
          .post('/api/session')
          .set('X-Arena-Client', '1')
          .send({ displayName: `Spammer ${i}` });
        last = res.status;
      }
      expect(last).toBe(429);
    } finally {
      await limited.server.stop();
    }
  });
});
