import { apiClient } from './api-client';

export interface DashboardMetrics {
  totalJobs: number;
  totalQueues: number;
  totalWorkers: number;
  onlineWorkers: number;
  totalProjects: number;
  totalOrganizations: number;
  jobsByStatus: Record<string, number>;
  recentJobs: Array<{
    id: string;
    type: string;
    status: string;
    queueId: string;
    createdAt: string;
  }>;
}

export const dashboardApi = {
  async getMetrics(): Promise<DashboardMetrics> {
    const { data } = await apiClient.get('/dashboard/metrics');
    return data.data;
  },
};
