import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException('An organization with this slug already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          memberships: {
            create: { userId, role: 'OWNER' },
          },
        },
      });

      return { ...organization, role: 'OWNER', memberCount: 1 };
    });
  }

  async findAll(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        organization: {
          include: { _count: { select: { memberships: true } } },
        },
      },
      orderBy: { organization: { name: 'asc' } },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      memberCount: m.organization._count.memberships,
      _count: undefined,
    }));
  }

  async findBySlug(userId: string, slug: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { user: { id: userId }, organization: { slug } },
      include: {
        organization: {
          include: { _count: { select: { memberships: true } } },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Organization not found');
    }

    return {
      ...membership.organization,
      role: membership.role,
      memberCount: membership.organization._count.memberships,
      _count: undefined,
    };
  }

  async update(userId: string, slug: string, dto: UpdateOrganizationDto) {
    const membership = await this.verifyRole(userId, slug, ['OWNER', 'ADMIN']);

    const organization = await this.prisma.organization.update({
      where: { id: membership.organizationId },
      data: { name: dto.name },
    });

    return { ...organization, role: membership.role };
  }

  async remove(userId: string, slug: string) {
    const membership = await this.verifyRole(userId, slug, ['OWNER']);

    await this.prisma.organization.delete({ where: { id: membership.organizationId } });
  }

  async getMembers(userId: string, slug: string) {
    const membership = await this.verifyRole(userId, slug, [
      'OWNER',
      'ADMIN',
      'DEVELOPER',
      'VIEWER',
    ]);

    const members = await this.prisma.membership.findMany({
      where: { organizationId: membership.organizationId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      role: m.role,
      createdAt: m.createdAt,
    }));
  }

  async inviteMember(userId: string, slug: string, dto: InviteMemberDto) {
    const membership = await this.verifyRole(userId, slug, ['OWNER', 'ADMIN']);

    const invitedUser = await this.usersService.findByEmail(dto.email);
    if (!invitedUser) {
      throw new NotFoundException('User with this email does not exist');
    }

    const existing = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: invitedUser.id,
          organizationId: membership.organizationId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }

    const newMembership = await this.prisma.membership.create({
      data: {
        userId: invitedUser.id,
        organizationId: membership.organizationId,
        role: dto.role,
      },
      include: { user: true },
    });

    return {
      id: newMembership.id,
      userId: newMembership.userId,
      email: newMembership.user.email,
      firstName: newMembership.user.firstName,
      lastName: newMembership.user.lastName,
      role: newMembership.role,
      createdAt: newMembership.createdAt,
    };
  }

  async updateMemberRole(userId: string, slug: string, memberId: string, dto: UpdateMemberRoleDto) {
    const membership = await this.verifyRole(userId, slug, ['OWNER', 'ADMIN']);

    const targetMembership = await this.prisma.membership.findFirst({
      where: { id: memberId, organizationId: membership.organizationId },
    });
    if (!targetMembership) {
      throw new NotFoundException('Member not found');
    }

    if (targetMembership.role === 'OWNER' && membership.role !== 'OWNER') {
      throw new ForbiddenException('Only owners can change another owner role');
    }

    const updated = await this.prisma.membership.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: { user: true },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      email: updated.user.email,
      firstName: updated.user.firstName,
      lastName: updated.user.lastName,
      role: updated.role,
      createdAt: updated.createdAt,
    };
  }

  async removeMember(userId: string, slug: string, memberId: string) {
    const membership = await this.verifyRole(userId, slug, ['OWNER', 'ADMIN']);

    const targetMembership = await this.prisma.membership.findFirst({
      where: { id: memberId, organizationId: membership.organizationId },
    });
    if (!targetMembership) {
      throw new NotFoundException('Member not found');
    }

    if (targetMembership.role === 'OWNER' && membership.role !== 'OWNER') {
      throw new ForbiddenException('Only owners can remove another owner');
    }

    if (targetMembership.id === membership.id) {
      throw new ForbiddenException('You cannot remove yourself');
    }

    await this.prisma.membership.delete({ where: { id: memberId } });
  }

  private async verifyRole(userId: string, slug: string, allowedRoles: string[]) {
    const membership = await this.prisma.membership.findFirst({
      where: { user: { id: userId }, organization: { slug } },
    });

    if (!membership) {
      throw new NotFoundException('Organization not found');
    }

    if (!allowedRoles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return membership;
  }
}
