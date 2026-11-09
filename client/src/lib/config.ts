import { APP_CONFIG } from '@arena/shared';

const env = import.meta.env;

export const config = {
  appName: (env.VITE_APP_NAME as string | undefined) || APP_CONFIG.name,
  tagline: APP_CONFIG.tagline,
  apiBaseUrl: ((env.VITE_API_BASE_URL as string | undefined) || '/api').replace(/\/$/, ''),
  /** Undefined = connect to the page's own origin. */
  socketUrl: (env.VITE_SOCKET_URL as string | undefined) || undefined,
};

export function inviteUrl(roomCode: string): string {
  return `${window.location.origin}/room/${roomCode}`;
}
