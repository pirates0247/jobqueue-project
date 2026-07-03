import { apiClient } from './api-client';

export interface Queue {
  id: string;
  projectId: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED';
  priority: number;
  concurrencyLimit: number;
  retryStrategy: 'FIXED' | 'LINEAR' | 'EXPONENTIAL';
  maxRetries: number;
  baseRetryDelayMs: number;
  createdAt: string;
  updatedAt: string;
  _count?: { jobs: number };
}

export interface CreateQueuePayload {
  name: string;
  priority?: number;
  concurrencyLimit?: number;
  retryStrategy?: string;
  maxRetries?: number;
  baseRetryDelayMs?: number;
}

export interface QueueListResponse {
  queues: Queue[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueueStats {
  total: number;
  byStatus: Record<string, number>;
}

export const queueApi = {
  async findAll(orgSlug: string, projectSlug: string, params?: { search?: string; page?: number; limit?: number }): Promise<QueueListResponse> {
    const { data } = await apiClient.get(`/organizations/${orgSlug}/projects/${projectSlug}/queues`, { params });
    return data.data;
  },

  async findByName(orgSlug: string, projectSlug: string, name: string): Promise<Queue> {
    const { data } = await apiClient.get(`/organizations/${orgSlug}/projects/${projectSlug}/queues/${encodeURIComponent(name)}`);
    return data.data;
  },

  async create(orgSlug: string, projectSlug: string, payload: CreateQueuePayload): Promise<Queue> {
    const { data } = await apiClient.post(`/organizations/${orgSlug}/projects/${projectSlug}/queues`, payload);
    return data.data;
  },

  async update(orgSlug: string, projectSlug: string, name: string, payload: Partial<CreateQueuePayload>): Promise<Queue> {
    const { data } = await apiClient.put(`/organizations/${orgSlug}/projects/${projectSlug}/queues/${encodeURIComponent(name)}`, payload);
    return data.data;
  },

  async pause(orgSlug: string, projectSlug: string, name: string): Promise<Queue> {
    const { data } = await apiClient.post(`/organizations/${orgSlug}/projects/${projectSlug}/queues/${encodeURIComponent(name)}/pause`);
    return data.data;
  },

  async resume(orgSlug: string, projectSlug: string, name: string): Promise<Queue> {
    const { data } = await apiClient.post(`/organizations/${orgSlug}/projects/${projectSlug}/queues/${encodeURIComponent(name)}/resume`);
    return data.data;
  },

  async remove(orgSlug: string, projectSlug: string, name: string): Promise<void> {
    await apiClient.delete(`/organizations/${orgSlug}/projects/${projectSlug}/queues/${encodeURIComponent(name)}`);
  },

  async stats(orgSlug: string, projectSlug: string, name: string): Promise<QueueStats> {
    const { data } = await apiClient.get(`/organizations/${orgSlug}/projects/${projectSlug}/queues/${encodeURIComponent(name)}/stats`);
    return data.data;
  },
};
