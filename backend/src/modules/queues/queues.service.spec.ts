import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { QueuesService } from './queues.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('QueuesService', () => {
  let service: QueuesService;
  let prisma: any;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        QueuesService,
        {
          provide: PrismaService,
          useValue: {
            queue: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            job: {
              groupBy: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(QueuesService);
    prisma = moduleRef.get(PrismaService);
  });

  describe('create', () => {
    it('throws ConflictException if queue name already exists', async () => {
      prisma.queue.findUnique.mockResolvedValue({ id: 'q-1', name: 'existing' });

      await expect(service.create('proj-1', { name: 'existing' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates a new queue with defaults', async () => {
      prisma.queue.findUnique.mockResolvedValue(null);
      prisma.queue.create.mockResolvedValue({ id: 'q-1', name: 'my-queue' });

      const result = await service.create('proj-1', { name: 'my-queue' });

      expect(result).toEqual({ id: 'q-1', name: 'my-queue' });
      expect(prisma.queue.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 'proj-1',
          name: 'my-queue',
          priority: 0,
          concurrencyLimit: 5,
        }),
      });
    });
  });

  describe('findByName', () => {
    it('throws NotFoundException if not found', async () => {
      prisma.queue.findUnique.mockResolvedValue(null);
      await expect(service.findByName('proj-1', 'nope')).rejects.toThrow(NotFoundException);
    });
  });
});
