import { ERROR_MESSAGES, type ApiErrorBody, type ErrorCode } from '@arena/shared';

const STATUS_BY_CODE: Partial<Record<ErrorCode, number>> = {
  VALIDATION_ERROR: 400,
  INVALID_INDEX: 400,
  UNAUTHORIZED: 401,
  SESSION_EXPIRED: 401,
  FORBIDDEN: 403,
  NOT_A_MEMBER: 403,
  NOT_FOUND: 404,
  ROOM_NOT_FOUND: 404,
  ROOM_FULL: 409,
  CELL_OCCUPIED: 409,
  ILLEGAL_MOVE: 409,
  DUPLICATE_MOVE: 409,
  STALE_STATE: 409,
  STALE_ROUND: 409,
  STATE_CONFLICT: 409,
  NOT_YOUR_TURN: 409,
  GAME_NOT_IN_PROGRESS: 409,
  REMATCH_NOT_AVAILABLE: 409,
  ROOM_EXPIRED: 410,
  ROOM_CLOSED: 410,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  FEATURE_DISABLED: 404,
  INTERNAL_ERROR: 500,
};

/** An expected, client-safe error with a stable machine-readable code. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code] ?? 400;
    this.details = details;
  }

  toBody(): ApiErrorBody {
    return this.details === undefined
      ? { code: this.code, message: this.message }
      : { code: this.code, message: this.message, details: this.details };
  }
}

export function isDuplicateKeyError(err: unknown, field?: string): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: number; keyPattern?: Record<string, unknown> };
  if (e.code !== 11000) return false;
  return field ? Boolean(e.keyPattern && field in e.keyPattern) : true;
}
