import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

export function zodDetails(issues: Array<{ path: (string | number)[]; message: string }>) {
  return issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
}

export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      next(new AppError('VALIDATION_ERROR', undefined, zodDetails(result.error.issues)));
      return;
    }
    req.body = result.data;
    next();
  };
}
