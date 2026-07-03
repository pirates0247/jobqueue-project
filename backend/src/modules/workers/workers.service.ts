import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterWorkerDto } from './dto/register-worker.dto';
import { ClaimJobsDto } from './dto/claim-jobs.dto';
import { CompleteJobDto } from './dto/complete-job.dto';
import { FailJobDto } from './dto/fail-job.dto';

@Injectable()
export class WorkersService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterWorkerDto) {
    return this.prisma.worker.create({
      data: {
        name: dto.name,
        hostname: dto.hostname,
        concurrency: dto.concurrency ?? 1,
        status: 'ONLINE',
        lastHeartbeat: new Date(),
        metadata: dto.metadata ?? {},
      },
    });
  }

  async heartbeat(id: string) {
    const worker = await this.prisma.worker.findUnique({ where: { id } });
    if (!worker) throw new NotFoundException('Worker not found');

    return this.prisma.worker.update({
      where: { id },
      data: { lastHeartbeat: new Date(), status: 'ONLINE' },
    });
  }

  async claimJobs(workerId: string, dto: ClaimJobsDto) {
    const worker = await this.prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker) throw new NotFoundException('Worker not found');

    // Update heartbeat
    await this.prisma.worker.update({
      where: { id: workerId },
      data: { lastHeartbeat: new Date(), status: 'ONLINE' },
    });

    const limit = dto.limit ?? worker.concurrency;
    const now = new Date();

    // Find available jobs in the specified queues
    const availableJobs = await this.prisma.job.findMany({
      where: {
        queueId: { in: dto.queueIds },
        status: { in: ['QUEUED', 'SCHEDULED'] },
        AND: [{ OR: [{ runAt: null }, { runAt: { lte: now } }] }],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: limit,
    });

    if (availableJobs.length === 0) return { claimed: [] };

    // Atomically claim jobs using a transaction
    const claimedJobs = await this.prisma.$transaction(
      availableJobs.map((job) =>
        this.prisma.job.update({
          where: {
            id: job.id,
            status: job.status as any, // Ensure it hasn't been claimed in another transaction
          },
          data: {
            status: 'CLAIMED',
            claimedBy: workerId,
            claimedAt: now,
            startedAt: now,
          },
        }),
      ),
    );

    // Write execution logs
    for (const job of claimedJobs) {
      await this.prisma.executionLog.create({
        data: {
          jobId: job.id,
          workerId,
          level: 'info',
          message: `Job claimed by worker ${worker.name}`,
        },
      });
    }

    return { claimed: claimedJobs };
  }

  async completeJob(workerId: string, jobId: string, dto: CompleteJobDto) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.claimedBy !== workerId) throw new BadRequestException('Job not claimed by this worker');

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: now,
        },
      }),
      this.prisma.executionLog.create({
        data: {
          jobId,
          workerId,
          level: 'info',
          message: dto.result ? `Job completed: ${dto.result}` : 'Job completed successfully',
        },
      }),
    ]);

    return this.prisma.job.findUnique({ where: { id: jobId } });
  }

  async failJob(workerId: string, jobId: string, dto: FailJobDto) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.claimedBy !== workerId) throw new BadRequestException('Job not claimed by this worker');

    const now = new Date();
    const newAttempts = job.attempts + 1;
    const willRetry = newAttempts <= job.maxRetries;
    const queue = await this.prisma.queue.findUnique({ where: { id: job.queueId } });

    // Calculate retry delay
    let delayMs = queue?.baseRetryDelayMs ?? 1000;
    if (queue?.retryStrategy === 'LINEAR') delayMs = delayMs * newAttempts;
    else if (queue?.retryStrategy === 'EXPONENTIAL')
      delayMs = delayMs * Math.pow(2, newAttempts - 1);

    const scheduledAt = new Date(now.getTime() + delayMs);

    await this.prisma.$transaction([
      this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: willRetry ? 'SCHEDULED' : 'FAILED',
          attempts: newAttempts,
          failedAt: willRetry ? null : now,
          runAt: willRetry ? scheduledAt : null,
          claimedBy: null,
          claimedAt: null,
          startedAt: null,
        },
      }),
      this.prisma.executionLog.create({
        data: {
          jobId,
          workerId,
          level: 'error',
          message: dto.error ? `Job failed: ${dto.error}` : 'Job failed',
        },
      }),
      this.prisma.retryHistory.create({
        data: {
          jobId,
          attempt: newAttempts,
          reason: dto.error ?? 'Unknown error',
          delayMs,
          scheduledAt,
        },
      }),
    ]);

    return this.prisma.job.findUnique({ where: { id: jobId } });
  }

  async findAll() {
    const workers = await this.prisma.worker.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Mark stale workers as OFFLINE
    const staleThreshold = new Date(Date.now() - 30000); // 30 seconds
    for (const worker of workers) {
      if (
        worker.status === 'ONLINE' &&
        (!worker.lastHeartbeat || worker.lastHeartbeat < staleThreshold)
      ) {
        await this.prisma.worker.update({
          where: { id: worker.id },
          data: { status: 'OFFLINE' },
        });
        worker.status = 'OFFLINE';
      }
    }

    return workers;
  }

  async findById(id: string) {
    const worker = await this.prisma.worker.findUnique({
      where: { id },
    });
    if (!worker) throw new NotFoundException('Worker not found');
    return worker;
  }

  async remove(id: string) {
    const worker = await this.findById(id);
    await this.prisma.worker.delete({ where: { id: worker.id } });
  }
}
