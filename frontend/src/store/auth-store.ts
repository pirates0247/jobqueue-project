import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isHydrated: boolean;
  setSession: (user: AuthUser, accessToken: string) => void;
  clearSession: () => void;
  setHydrated: (value: boolean) => void;
}

/**
 * Access tokens are kept in memory only (never localStorage) to limit XSS
 * blast radius. The refresh token lives in an httpOnly cookie set by the
 * backend and is never exposed to client JS. On full page load, the app
 * silently calls /auth/refresh once to repopulate this store.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isHydrated: false,
  setSession: (user, accessToken) => set({ user, accessToken }),
  clearSession: () => set({ user: null, accessToken: null }),
  setHydrated: (value) => set({ isHydrated: value }),
}));
