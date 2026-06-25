import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PlatformAdminJwtPayload, RequestWithAdmin } from './admin.types';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PlatformAdminJwtPayload | undefined => {
    const req = ctx.switchToHttp().getRequest<RequestWithAdmin>();
    return req.admin;
  },
);
