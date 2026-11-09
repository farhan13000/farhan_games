import type { ApiResponse, AuthPayload } from '@arena/shared';
import { useAuthStore } from '../store/authStore';
import { config } from './config';
import { ApiError } from './errors';

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
}

async function request<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'X-Arena-Client': '1' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('NETWORK_ERROR');
  }

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(
      res.status >= 500 ? 'INTERNAL_ERROR' : 'NETWORK_ERROR',
      undefined,
      undefined,
      res.status,
    );
  }
  if (!json.ok)
    throw new ApiError(json.error.code, json.error.message, json.error.details, res.status);
  return json.data;
}

let refreshInFlight: Promise<AuthPayload | null> | null = null;

/** Exchanges the HttpOnly session cookie for a new access token (deduplicated). */
export function refreshSession(): Promise<AuthPayload | null> {
  refreshInFlight ??= request<AuthPayload | null>('/session/refresh', { method: 'POST' })
    .then((payload) => {
      if (payload) useAuthStore.getState().setAuth(payload);
      else useAuthStore.getState().clear();
      return payload;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

/** No accounts: a player is just a display name remembered by an HttpOnly cookie. */
export const sessionApi = {
  start: (displayName: string) =>
    request<AuthPayload>('/session', { method: 'POST', body: { displayName } }),
  end: () => request<{ ended: true }>('/session/end', { method: 'POST' }),
};
