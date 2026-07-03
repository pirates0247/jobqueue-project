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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('organizations/:slug/projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveOrgId(slug: string) {
    const org = await this.prisma.organization.findUnique({ where: { slug } });
    if (!org) throw new NotFoundException('Organization not found');
    return org.id;
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  @HttpCode(HttpStatus.CREATED)
  async create(@Param('slug') slug: string, @Body() dto: CreateProjectDto) {
    const organizationId = await this.resolveOrgId(slug);
    return this.projectsService.create(organizationId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Param('slug') slug: string, @Query() query: ProjectQueryDto) {
    const organizationId = await this.resolveOrgId(slug);
    return this.projectsService.findAll(organizationId, query);
  }

  @Get(':projectSlug')
  @HttpCode(HttpStatus.OK)
  async findBySlug(@Param('slug') slug: string, @Param('projectSlug') projectSlug: string) {
    const organizationId = await this.resolveOrgId(slug);
    return this.projectsService.findBySlug(organizationId, projectSlug);
  }

  @Put(':projectSlug')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'DEVELOPER')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('slug') slug: string,
    @Param('projectSlug') projectSlug: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const organizationId = await this.resolveOrgId(slug);
    return this.projectsService.update(organizationId, projectSlug, dto);
  }

  @Delete(':projectSlug')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('slug') slug: string, @Param('projectSlug') projectSlug: string) {
    const organizationId = await this.resolveOrgId(slug);
    await this.projectsService.remove(organizationId, projectSlug);
  }
}
