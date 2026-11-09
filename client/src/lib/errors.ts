import { ERROR_MESSAGES, type ErrorCode } from '@arena/shared';

export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR' | 'TIMEOUT';

export class ApiError extends Error {
  constructor(
    readonly code: ClientErrorCode,
    message?: string,
    readonly details?: unknown,
    readonly status?: number,
  ) {
    super(message ?? messageFor(code));
    this.name = 'ApiError';
  }
}

export function messageFor(code: ClientErrorCode): string {
  if (code === 'NETWORK_ERROR')
    return 'Cannot reach the server. Check your connection and try again.';
  if (code === 'TIMEOUT') return 'The server took too long to respond. Please try again.';
  return ERROR_MESSAGES[code] ?? 'Something went wrong.';
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  return new ApiError('INTERNAL_ERROR');
}

/** Field-level messages from a VALIDATION_ERROR response. */
export function fieldErrors(err: ApiError): Record<string, string> {
  if (!Array.isArray(err.details)) return {};
  return Object.fromEntries(
    (err.details as Array<{ field: string; message: string }>).map((d) => [d.field, d.message]),
  );
}
