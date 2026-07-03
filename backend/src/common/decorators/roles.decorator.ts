import { SetMetadata } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to members holding one of the given organization roles.
 * Enforced together with an organization-scoped RolesGuard added in the
 * Organizations feature (this guard reads req.membership.role).
 */
export const Roles = (...roles: MembershipRole[]) => SetMetadata(ROLES_KEY, roles);
