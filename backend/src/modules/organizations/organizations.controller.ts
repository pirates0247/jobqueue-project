import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(userId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@CurrentUser('id') userId: string) {
    return this.organizationsService.findAll(userId);
  }

  @Get(':slug')
  @HttpCode(HttpStatus.OK)
  async findBySlug(@CurrentUser('id') userId: string, @Param('slug') slug: string) {
    return this.organizationsService.findBySlug(userId, slug);
  }

  @Put(':slug')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(userId, slug, dto);
  }

  @Delete(':slug')
  @UseGuards(RolesGuard)
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser('id') userId: string, @Param('slug') slug: string) {
    await this.organizationsService.remove(userId, slug);
  }

  @Get(':slug/members')
  @HttpCode(HttpStatus.OK)
  async getMembers(@CurrentUser('id') userId: string, @Param('slug') slug: string) {
    return this.organizationsService.getMembers(userId, slug);
  }

  @Post(':slug/members')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async inviteMember(
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.organizationsService.inviteMember(userId, slug, dto);
  }

  @Put(':slug/members/:memberId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async updateMemberRole(
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.organizationsService.updateMemberRole(userId, slug, memberId, dto);
  }

  @Delete(':slug/members/:memberId')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
    @Param('memberId') memberId: string,
  ) {
    await this.organizationsService.removeMember(userId, slug, memberId);
  }
}
