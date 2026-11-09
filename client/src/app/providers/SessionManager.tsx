import { useEffect } from 'react';
import { refreshSession } from '../../lib/api';
import { socketManager } from '../../lib/socket';
import { useAuthStore } from '../../store/authStore';

/**
 * Restores the session from the HttpOnly cookie on load, keeps the access token
 * fresh, and ties the socket connection to the current identity.
 */
export function SessionManager() {
  const status = useAuthStore((s) => s.status);
  const playerId = useAuthStore((s) => s.profile?.playerId);
  const expiresAt = useAuthStore((s) => s.expiresAt);

  // 1. Bootstrap from the session cookie (keeps the same guest identity across reloads).
  useEffect(() => {
    refreshSession().catch(() => useAuthStore.getState().clear());
  }, []);

  // 2. One socket per identity.
  useEffect(() => {
    if (status === 'authenticated' && playerId) socketManager.ensure();
    else if (status === 'anonymous') socketManager.disconnect();
  }, [status, playerId]);

  // 3. Refresh the access token a minute before it expires.
  useEffect(() => {
    if (status !== 'authenticated' || !expiresAt) return;
    const delay = Math.max(5_000, expiresAt - Date.now() - 60_000);
    const timer = setTimeout(() => void refreshSession().catch(() => undefined), delay);
    return () => clearTimeout(timer);
  }, [status, expiresAt]);

  // 4. Recover promptly after tab sleep or network loss.
  useEffect(() => {
    const wake = () => {
      if (document.visibilityState === 'visible') socketManager.nudge();
    };
    window.addEventListener('online', wake);
    document.addEventListener('visibilitychange', wake);
    return () => {
      window.removeEventListener('online', wake);
      document.removeEventListener('visibilitychange', wake);
    };
  }, []);

  return null;
}
