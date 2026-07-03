import { apiClient } from './api-client';

export interface Worker {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE';
  lastHeartbeat: string | null;
  hostname: string | null;
  concurrency: number;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterWorkerPayload {
  name: string;
  hostname?: string;
  concurrency?: number;
  metadata?: Record<string, any>;
}

export interface ClaimJobsPayload {
  queueIds: string[];
  limit?: number;
}

export const workerApi = {
  async findAll(): Promise<Worker[]> {
    const { data } = await apiClient.get('/workers');
    return data.data;
  },

  async findById(id: string): Promise<Worker> {
    const { data } = await apiClient.get(`/workers/${id}`);
    return data.data;
  },

  async register(payload: RegisterWorkerPayload): Promise<Worker> {
    const { data } = await apiClient.post('/workers/register', payload);
    return data.data;
  },

  async heartbeat(id: string): Promise<Worker> {
    const { data } = await apiClient.post(`/workers/${id}/heartbeat`);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/workers/${id}`);
  },
};
