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
  Query,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobQueryDto } from './dto/job-query.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('organizations/:slug/projects/:projectSlug/queues/:name/jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveQueueId(slug: string, projectSlug: string, name: string) {
    const org = await this.prisma.organization.findUnique({ where: { slug } });
    if (!org) throw new NotFoundException('Organization not found');
    const project = await this.prisma.project.findUnique({
      where: { organizationId_slug: { organizationId: org.id, slug: projectSlug } },
    });
    if (!project) throw new NotFoundException('Project not found');
    const queue = await this.prisma.queue.findUnique({
      where: { projectId_name: { projectId: project.id, name } },
    });
    if (!queue) throw new NotFoundException('Queue not found');
    return queue.id;
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
    @Body() dto: CreateJobDto,
  ) {
    const queueId = await this.resolveQueueId(slug, projectSlug, name);
    return this.jobsService.create(queueId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
    @Query() query: JobQueryDto,
  ) {
    const queueId = await this.resolveQueueId(slug, projectSlug, name);
    return this.jobsService.findAll(queueId, query);
  }

  @Get(':jobId')
  @HttpCode(HttpStatus.OK)
  async findById(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
    @Param('jobId') jobId: string,
  ) {
    await this.resolveQueueId(slug, projectSlug, name);
    return this.jobsService.findById(jobId);
  }

  @Post(':jobId/retry')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  @HttpCode(HttpStatus.OK)
  async retry(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
    @Param('jobId') jobId: string,
  ) {
    await this.resolveQueueId(slug, projectSlug, name);
    return this.jobsService.retry(jobId);
  }

  @Post(':jobId/cancel')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
    @Param('jobId') jobId: string,
  ) {
    await this.resolveQueueId(slug, projectSlug, name);
    return this.jobsService.cancel(jobId);
  }

  @Delete(':jobId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
    @Param('jobId') jobId: string,
  ) {
    await this.resolveQueueId(slug, projectSlug, name);
    await this.jobsService.remove(jobId);
  }
}
