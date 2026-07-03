import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('JobsService', () => {
  let service: JobsService;
  let prisma: any;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: PrismaService,
          useValue: {
            queue: {
              findUnique: jest.fn(),
            },
            job: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            executionLog: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(JobsService);
    prisma = moduleRef.get(PrismaService);
  });

  describe('create', () => {
    it('throws if queue is not found', async () => {
      prisma.queue.findUnique.mockResolvedValue(null);
      await expect(service.create('q-1', { payload: {} })).rejects.toThrow('Queue not found');
    });

    it('creates a job with defaults', async () => {
      prisma.queue.findUnique.mockResolvedValue({ id: 'q-1', status: 'ACTIVE', maxRetries: 3 });
      prisma.job.create.mockResolvedValue({
        id: 'job-1',
        payload: {},
        type: 'IMMEDIATE',
        status: 'QUEUED',
      });

      const result = await service.create('q-1', { payload: {} });
      expect(result).toBeDefined();
      expect(result.status).toBe('QUEUED');
    });
  });
});
