import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    const [
      totalJobs,
      jobsByStatus,
      totalQueues,
      totalWorkers,
      onlineWorkers,
      recentJobs,
      totalProjects,
      totalOrganizations,
    ] = await Promise.all([
      this.prisma.job.count(),
      this.prisma.job.groupBy({ by: ['status'], _count: true }),
      this.prisma.queue.count(),
      this.prisma.worker.count(),
      this.prisma.worker.count({ where: { status: 'ONLINE' } }),
      this.prisma.job.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          status: true,
          queueId: true,
          createdAt: true,
        },
      }),
      this.prisma.project.count(),
      this.prisma.organization.count(),
    ]);

    const statusMap: Record<string, number> = {};
    for (const entry of jobsByStatus) {
      statusMap[entry.status] = entry._count;
    }

    return {
      totalJobs,
      totalQueues,
      totalWorkers,
      onlineWorkers,
      totalProjects,
      totalOrganizations,
      jobsByStatus: statusMap,
      recentJobs,
    };
  }
}
