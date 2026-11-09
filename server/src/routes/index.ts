import { Router } from 'express';
import mongoose from 'mongoose';
import { guestSessionSchema, type ApiSuccess } from '@arena/shared';
import type { AppConfig } from '../config/env';
import { isDatabaseReady } from '../config/db';
import { createSessionController } from '../controllers/authController';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requireClientHeader } from '../middleware/auth';
import { createRateLimiters } from '../middleware/rateLimits';
import { validateBody } from '../middleware/validate';

const startedAt = Date.now();

export function createApiRouter(config: AppConfig): Router {
  const router = Router();
  const limits = createRateLimiters(config);
  const session = createSessionController(config);

  router.get('/health', (_req, res) => {
    const dbUp = isDatabaseReady();
    const body: ApiSuccess<object> = {
      ok: true,
      data: {
        status: dbUp ? 'ok' : 'degraded',
        db: dbUp ? 'up' : mongoose.STATES[mongoose.connection.readyState],
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      },
    };
    res.status(dbUp ? 200 : 503).json(body);
  });

  router.use(limits.api);

  /* ------------------- anonymous player session (no accounts) ------------------- */
  const sessionRouter = Router();
  sessionRouter.use(requireClientHeader);
  sessionRouter.post(
    '/',
    limits.session,
    validateBody(guestSessionSchema),
    asyncHandler(session.start),
  );
  sessionRouter.post('/refresh', limits.refresh, asyncHandler(session.refresh));
  sessionRouter.post('/end', asyncHandler(session.end));
  sessionRouter.get('/me', requireAuth(config), asyncHandler(session.me));
  router.use('/session', sessionRouter);

  return router;
}
