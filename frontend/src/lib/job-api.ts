import { apiClient } from './api-client';

export interface Job {
  id: string;
  queueId: string;
  type: 'IMMEDIATE' | 'DELAYED' | 'SCHEDULED' | 'RECURRING' | 'BATCH';
  status: string;
  payload: Record<string, any>;
  priority: number;
  attempts: number;
  maxRetries: number;
  cronExpression: string | null;
  runAt: string | null;
  claimedBy: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  idempotencyKey: string | null;
  batchId: string | null;
  parentJobId: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { executionLogs: number };
  executionLogs?: { id: string; level: string; message: string; createdAt: string }[];
  retryHistory?: { id: string; attempt: number; reason: string | null; delayMs: number; scheduledAt: string; createdAt: string }[];
}

export interface CreateJobPayload {
  type?: string;
  payload: Record<string, any>;
  priority?: number;
  maxRetries?: number;
  cronExpression?: string;
  runAt?: string;
  idempotencyKey?: string;
  batchId?: string;
  parentJobId?: string;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const jobApi = {
  async findAll(orgSlug: string, projectSlug: string, queueName: string, params?: { status?: string; type?: string; page?: number; limit?: number }): Promise<JobListResponse> {
    const { data } = await apiClient.get(`/organizations/${orgSlug}/projects/${projectSlug}/queues/${encodeURIComponent(queueName)}/jobs`, { params });
    return data.data;
  },

  async findById(orgSlug: string, projectSlug: string, queueName: string, jobId: string): Promise<Job> {
    const { data } = await apiClient.get(`/organizations/${orgSlug}/projects/${projectSlug}/queues/${encodeURIComponent(queueName)}/jobs/${jobId}`);
    return data.data;
  },

  async create(orgSlug: string, projectSlug: string, queueName: string, payload: CreateJobPayload): Promise<Job> {
    const { data } = await apiClient.post(`/organizations/${orgSlug}/projects/${projectSlug}/queues/${encodeURIComponent(queueName)}/jobs`, payload);
    return data.data;
  },

  async retry(orgSlug: string, projectSlug: string, queueName: string, jobId: string): Promise<Job> {
    const { data } = await apiClient.post(`/organizations/${orgSlug}/projects/${projectSlug}/queues/${encodeURIComponent(queueName)}/jobs/${jobId}/retry`);
    return data.data;
  },

  async cancel(orgSlug: string, projectSlug: string, queueName: string, jobId: string): Promise<Job> {
    const { data } = await apiClient.post(`/organizations/${orgSlug}/projects/${projectSlug}/queues/${encodeURIComponent(queueName)}/jobs/${jobId}/cancel`);
    return data.data;
  },

  async remove(orgSlug: string, projectSlug: string, queueName: string, jobId: string): Promise<void> {
    await apiClient.delete(`/organizations/${orgSlug}/projects/${projectSlug}/queues/${encodeURIComponent(queueName)}/jobs/${jobId}`);
  },
};
