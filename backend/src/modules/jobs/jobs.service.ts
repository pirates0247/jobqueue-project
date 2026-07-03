import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobQueryDto } from './dto/job-query.dto';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(queueId: string, dto: CreateJobDto) {
    const queue = await this.prisma.queue.findUnique({ where: { id: queueId } });
    if (!queue) throw new NotFoundException('Queue not found');
    if (queue.status === 'PAUSED') throw new BadRequestException('Queue is paused');

    if (dto.idempotencyKey) {
      const existing = await this.prisma.job.findUnique({
        where: { queueId_idempotencyKey: { queueId, idempotencyKey: dto.idempotencyKey } },
      });
      if (existing) throw new BadRequestException('Job with this idempotency key already exists');
    }

    const type = dto.type ?? 'IMMEDIATE';
    let runAt: Date | undefined;

    if (type === 'DELAYED' && dto.runAt) {
      runAt = new Date(dto.runAt);
      if (runAt <= new Date()) throw new BadRequestException('runAt must be in the future');
    }
    if (type === 'SCHEDULED' && !dto.cronExpression) {
      throw new BadRequestException('SCHEDULED jobs require a cronExpression');
    }
    if (type === 'RECURRING' && !dto.cronExpression) {
      throw new BadRequestException('RECURRING jobs require a cronExpression');
    }

    const status = type === 'IMMEDIATE' ? 'QUEUED' : type === 'DELAYED' ? 'SCHEDULED' : 'SCHEDULED';

    return this.prisma.job.create({
      data: {
        queueId,
        type: type as any,
        status: status as any,
        payload: dto.payload,
        priority: dto.priority ?? 0,
        maxRetries: dto.maxRetries ?? queue.maxRetries,
        cronExpression: dto.cronExpression,
        runAt,
        idempotencyKey: dto.idempotencyKey,
        batchId: dto.batchId,
        parentJobId: dto.parentJobId,
      },
    });
  }

  async findAll(queueId: string, query: JobQueryDto) {
    const { status, type, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = { queueId };
    if (status) where.status = status;
    if (type) where.type = type;

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { _count: { select: { executionLogs: true } } },
      }),
      this.prisma.job.count({ where }),
    ]);

    return { jobs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        executionLogs: { orderBy: { createdAt: 'asc' } },
        retryHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async retry(id: string) {
    const job = await this.findById(id);
    if (job.status !== 'FAILED') throw new BadRequestException('Only failed jobs can be retried');

    return this.prisma.job.update({
      where: { id },
      data: {
        status: 'QUEUED',
        attempts: 0,
        startedAt: null,
        completedAt: null,
        failedAt: null,
        claimedBy: null,
        claimedAt: null,
      },
    });
  }

  async cancel(id: string) {
    const job = await this.findById(id);
    if (!['QUEUED', 'SCHEDULED'].includes(job.status)) {
      throw new BadRequestException('Only queued or scheduled jobs can be cancelled');
    }

    return this.prisma.job.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.job.delete({ where: { id } });
  }
}
