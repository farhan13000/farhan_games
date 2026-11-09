import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ERROR_MESSAGES, type ApiFailure } from '@arena/shared';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export const notFoundHandler: RequestHandler = (_req, res) => {
  const body: ApiFailure = {
    ok: false,
    error: { code: 'NOT_FOUND', message: ERROR_MESSAGES.NOT_FOUND },
  };
  res.status(404).json(body);
};

/** Converts any error into the standard envelope. Never leaks stack traces or internals. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let appError: AppError;
  if (err instanceof AppError) {
    appError = err;
  } else if (err?.type === 'entity.too.large') {
    appError = new AppError('PAYLOAD_TOO_LARGE');
  } else if (err?.type === 'entity.parse.failed') {
    appError = new AppError('VALIDATION_ERROR', 'Malformed JSON body.');
  } else {
    logger.error({ err, method: req.method, url: req.originalUrl }, 'Unhandled request error');
    appError = new AppError('INTERNAL_ERROR');
  }
  const body: ApiFailure = { ok: false, error: appError.toBody() };
  res.status(appError.status).json(body);
};
