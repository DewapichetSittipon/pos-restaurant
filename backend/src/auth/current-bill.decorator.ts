import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Bill, Table } from '@prisma/client';
import type { RequestWithBill } from './auth.types';

export const CurrentBill = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): (Bill & { table: Table }) | undefined => {
    const req = ctx.switchToHttp().getRequest<RequestWithBill>();
    return req.bill;
  },
);
