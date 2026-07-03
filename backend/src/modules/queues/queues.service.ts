import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { QueueQueryDto } from './dto/queue-query.dto';

@Injectable()
export class QueuesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, dto: CreateQueueDto) {
    const existing = await this.prisma.queue.findUnique({
      where: { projectId_name: { projectId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException('A queue with this name already exists in this project');
    }

    return this.prisma.queue.create({
      data: {
        projectId,
        name: dto.name,
        priority: dto.priority ?? 0,
        concurrencyLimit: dto.concurrencyLimit ?? 5,
        retryStrategy: (dto.retryStrategy ?? 'EXPONENTIAL') as any,
        maxRetries: dto.maxRetries ?? 3,
        baseRetryDelayMs: dto.baseRetryDelayMs ?? 1000,
      },
    });
  }

  async findAll(projectId: string, query: QueueQueryDto) {
    const { search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = { projectId };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [queues, total] = await Promise.all([
      this.prisma.queue.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { _count: { select: { jobs: true } } },
      }),
      this.prisma.queue.count({ where }),
    ]);

    return { queues, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { id },
      include: { _count: { select: { jobs: true } } },
    });
    if (!queue) throw new NotFoundException('Queue not found');
    return queue;
  }

  async findByName(projectId: string, name: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { projectId_name: { projectId, name } },
      include: { _count: { select: { jobs: true } } },
    });
    if (!queue) throw new NotFoundException('Queue not found');
    return queue;
  }

  async update(projectId: string, name: string, dto: UpdateQueueDto) {
    const queue = await this.findByName(projectId, name);
    return this.prisma.queue.update({
      where: { id: queue.id },
      data: dto,
    });
  }

  async pause(projectId: string, name: string) {
    await this.findByName(projectId, name);
    return this.prisma.queue.update({
      where: { projectId_name: { projectId, name } },
      data: { status: 'PAUSED' },
    });
  }

  async resume(projectId: string, name: string) {
    await this.findByName(projectId, name);
    return this.prisma.queue.update({
      where: { projectId_name: { projectId, name } },
      data: { status: 'ACTIVE' },
    });
  }

  async remove(projectId: string, name: string) {
    const queue = await this.findByName(projectId, name);
    await this.prisma.queue.delete({ where: { id: queue.id } });
  }

  async stats(projectId: string, name: string) {
    const queue = await this.findByName(projectId, name);
    const counts = await this.prisma.job.groupBy({
      by: ['status'],
      where: { queueId: queue.id },
      _count: true,
    });

    const statusMap: Record<string, number> = {};
    for (const c of counts) {
      statusMap[c.status] = c._count;
    }

    return {
      total: counts.reduce((sum, c) => sum + c._count, 0),
      byStatus: statusMap,
    };
  }
}
