import type { AuthPayload, FeatureFlags, PublicProfile } from '@arena/shared';
import { create } from 'zustand';

type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

interface AuthState {
  status: AuthStatus;
  profile: PublicProfile | null;
  /** Short-lived access token, kept in memory only (never in localStorage). */
  accessToken: string | null;
  /** Epoch ms when the access token expires. */
  expiresAt: number;
  features: FeatureFlags;
  setAuth: (payload: AuthPayload) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  profile: null,
  accessToken: null,
  expiresAt: 0,
  features: { chat: true },
  setAuth: (payload) =>
    set({
      status: 'authenticated',
      profile: payload.profile,
      accessToken: payload.accessToken,
      expiresAt: Date.now() + payload.expiresIn * 1000,
      features: payload.features,
    }),
  clear: () => set({ status: 'anonymous', profile: null, accessToken: null, expiresAt: 0 }),
}));
