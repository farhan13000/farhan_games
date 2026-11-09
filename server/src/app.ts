import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { createApiRouter } from './routes';
import { logger } from './utils/logger';

export function corsOptions(config: AppConfig): CorsOptions {
  return {
    origin: (origin, callback) => {
      // Non-browser clients (curl, health checks) send no Origin header.
      if (!origin || config.clientOrigins.includes(origin)) callback(null, true);
      else callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Arena-Client'],
    maxAge: 600,
  };
}

export function createApp(config: AppConfig): Express {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use(helmet());
  app.use(cors(corsOptions(config)));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      logger.debug(
        { method: req.method, url: req.originalUrl, status: res.statusCode, ms },
        'request',
      );
    });
    next();
  });

  app.use('/api', createApiRouter(config));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
