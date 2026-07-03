import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { QueuesService } from './queues.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { QueueQueryDto } from './dto/queue-query.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('organizations/:slug/projects/:projectSlug/queues')
export class QueuesController {
  constructor(
    private readonly queuesService: QueuesService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveProjectId(slug: string, projectSlug: string) {
    const org = await this.prisma.organization.findUnique({ where: { slug } });
    if (!org) throw new NotFoundException('Organization not found');
    const project = await this.prisma.project.findUnique({
      where: { organizationId_slug: { organizationId: org.id, slug: projectSlug } },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project.id;
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Body() dto: CreateQueueDto,
  ) {
    const projectId = await this.resolveProjectId(slug, projectSlug);
    return this.queuesService.create(projectId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Query() query: QueueQueryDto,
  ) {
    const projectId = await this.resolveProjectId(slug, projectSlug);
    return this.queuesService.findAll(projectId, query);
  }

  @Get(':name')
  @HttpCode(HttpStatus.OK)
  async findByName(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
  ) {
    const projectId = await this.resolveProjectId(slug, projectSlug);
    return this.queuesService.findByName(projectId, name);
  }

  @Put(':name')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
    @Body() dto: UpdateQueueDto,
  ) {
    const projectId = await this.resolveProjectId(slug, projectSlug);
    return this.queuesService.update(projectId, name, dto);
  }

  @Post(':name/pause')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async pause(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
  ) {
    const projectId = await this.resolveProjectId(slug, projectSlug);
    return this.queuesService.pause(projectId, name);
  }

  @Post(':name/resume')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async resume(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
  ) {
    const projectId = await this.resolveProjectId(slug, projectSlug);
    return this.queuesService.resume(projectId, name);
  }

  @Delete(':name')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
  ) {
    const projectId = await this.resolveProjectId(slug, projectSlug);
    await this.queuesService.remove(projectId, name);
  }

  @Get(':name/stats')
  @HttpCode(HttpStatus.OK)
  async stats(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
  ) {
    const projectId = await this.resolveProjectId(slug, projectSlug);
    return this.queuesService.stats(projectId, name);
  }
}
