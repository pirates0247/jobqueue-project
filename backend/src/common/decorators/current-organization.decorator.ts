import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const CurrentOrganization = createParamDecorator(
  (data: keyof Prisma.OrganizationGetPayload<object> | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const org = request.organization ?? request.membership?.organization;
    return data ? org?.[data] : org;
  },
);
