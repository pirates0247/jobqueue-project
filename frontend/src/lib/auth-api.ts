import { apiClient } from './api-client';
import type { AuthUser } from '@/store/auth-store';

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  firstName: string;
  lastName: string;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post('/auth/login', payload);
    return data.data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post('/auth/register', payload);
    return data.data;
  },

  async refresh(): Promise<AuthResponse> {
    const { data } = await apiClient.post('/auth/refresh');
    return data.data;
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await apiClient.get('/auth/me');
    return data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};
