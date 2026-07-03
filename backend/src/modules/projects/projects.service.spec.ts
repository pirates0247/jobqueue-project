import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: any;

  const mockProject = {
    id: 'proj-1',
    organizationId: 'org-1',
    name: 'Test Project',
    slug: 'test-project',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: {
            project: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ProjectsService);
    prisma = moduleRef.get(PrismaService);
  });

  describe('create', () => {
    it('throws ConflictException if slug already exists', async () => {
      prisma.project.findUnique.mockResolvedValue(mockProject);

      await expect(service.create('org-1', { name: 'Test', slug: 'test-project' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates a new project', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      prisma.project.create.mockResolvedValue(mockProject);

      const result = await service.create('org-1', {
        name: 'Test Project',
        slug: 'test-project',
      });

      expect(result).toEqual(mockProject);
      expect(prisma.project.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          name: 'Test Project',
          slug: 'test-project',
          description: undefined,
        },
      });
    });
  });

  describe('findBySlug', () => {
    it('throws NotFoundException if project not found', async () => {
      prisma.project.findUnique.mockResolvedValue(null);
      await expect(service.findBySlug('org-1', 'nope')).rejects.toThrow(NotFoundException);
    });

    it('returns the project', async () => {
      prisma.project.findUnique.mockResolvedValue(mockProject);
      const result = await service.findBySlug('org-1', 'test-project');
      expect(result).toEqual(mockProject);
    });
  });
});
