import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateProjectDto) {
    const existing = await this.prisma.project.findUnique({
      where: { organizationId_slug: { organizationId, slug: dto.slug } },
    });
    if (existing) {
      throw new ConflictException('A project with this slug already exists in this organization');
    }

    return this.prisma.project.create({
      data: {
        organizationId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
      },
    });
  }

  async findAll(organizationId: string, query: ProjectQueryDto) {
    const { search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { _count: { select: { queues: true } } },
      }),
      this.prisma.project.count({ where }),
    ]);

    return { projects, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findBySlug(organizationId: string, slug: string) {
    const project = await this.prisma.project.findUnique({
      where: { organizationId_slug: { organizationId, slug } },
      include: { _count: { select: { queues: true } } },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async update(organizationId: string, slug: string, dto: UpdateProjectDto) {
    const project = await this.findBySlug(organizationId, slug);
    return this.prisma.project.update({
      where: { id: project.id },
      data: dto,
    });
  }

  async remove(organizationId: string, slug: string) {
    const project = await this.findBySlug(organizationId, slug);
    await this.prisma.project.delete({ where: { id: project.id } });
  }
}
