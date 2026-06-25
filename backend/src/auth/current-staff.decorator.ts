import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload, RequestWithStaff } from './auth.types';

export const CurrentStaff = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const req = ctx.switchToHttp().getRequest<RequestWithStaff>();
    return req.staff;
  },
);
