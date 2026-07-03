import { apiClient } from './api-client';

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { queues: number };
  queues?: number;
}

export interface CreateProjectPayload {
  name: string;
  slug: string;
  description?: string;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const projectApi = {
  async findAll(orgSlug: string, params?: { search?: string; page?: number; limit?: number }): Promise<ProjectListResponse> {
    const { data } = await apiClient.get(`/organizations/${orgSlug}/projects`, { params });
    return data.data;
  },

  async findBySlug(orgSlug: string, projectSlug: string): Promise<Project> {
    const { data } = await apiClient.get(`/organizations/${orgSlug}/projects/${projectSlug}`);
    return data.data;
  },

  async create(orgSlug: string, payload: CreateProjectPayload): Promise<Project> {
    const { data } = await apiClient.post(`/organizations/${orgSlug}/projects`, payload);
    return data.data;
  },

  async update(orgSlug: string, projectSlug: string, payload: Partial<CreateProjectPayload>): Promise<Project> {
    const { data } = await apiClient.put(`/organizations/${orgSlug}/projects/${projectSlug}`, payload);
    return data.data;
  },

  async remove(orgSlug: string, projectSlug: string): Promise<void> {
    await apiClient.delete(`/organizations/${orgSlug}/projects/${projectSlug}`);
  },
};
