'use client';

import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authApi, type LoginPayload, type RegisterPayload } from '@/lib/auth-api';
import { useAuthStore } from '@/store/auth-store';

/**
 * Call once near the app root (e.g. in the dashboard layout) to silently
 * exchange the httpOnly refresh cookie for a fresh access token on load,
 * so a hard refresh doesn't bounce an already-authenticated user to /login.
 */
export function useAuthBootstrap() {
  const { setSession, setHydrated, isHydrated } = useAuthStore();

  useEffect(() => {
    if (isHydrated) return;

    authApi
      .refresh()
      .then(({ user, accessToken }) => setSession(user, accessToken))
      .catch(() => {
        /* not logged in; that's fine */
      })
      .finally(() => setHydrated(true));
  }, [isHydrated, setSession, setHydrated]);
}

export function useAuth() {
  const router = useRouter();
  const { user, accessToken, setSession, clearSession } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: ({ user, accessToken }) => {
      setSession(user, accessToken);
      toast.success(`Welcome back, ${user.firstName}`);
      router.push('/dashboard');
    },
    onError: () => {
      toast.error('Invalid email or password');
    },
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: ({ user, accessToken }) => {
      setSession(user, accessToken);
      toast.success('Account created');
      router.push('/dashboard');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message ?? 'Could not create account';
      toast.error(Array.isArray(message) ? message[0] : message);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearSession();
      router.push('/login');
    },
  });

  return {
    user,
    accessToken,
    isAuthenticated: Boolean(accessToken),
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    logout: logoutMutation.mutate,
  };
}
