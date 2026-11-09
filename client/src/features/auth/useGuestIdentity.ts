import { useCallback } from 'react';
import { sessionApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

/** Returns a function that guarantees a player identity, creating one from a name if needed. */
export function useEnsureIdentity() {
  const status = useAuthStore((s) => s.status);
  const ensure = useCallback(async (displayName?: string) => {
    if (useAuthStore.getState().status === 'authenticated') return;
    if (!displayName) throw new Error('A display name is required');
    const payload = await sessionApi.start(displayName);
    useAuthStore.getState().setAuth(payload);
  }, []);
  return { needsName: status !== 'authenticated', ensure };
}
