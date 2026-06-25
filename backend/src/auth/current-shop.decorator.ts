import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { RequestWithStaff } from './auth.types';

// ดึง shopId ของ staff ที่ล็อกอิน (ต้องวางหลัง JwtAuthGuard เสมอ)
export const CurrentShop = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const req = ctx.switchToHttp().getRequest<RequestWithStaff>();
    if (!req.staff) {
      throw new InternalServerErrorException('ไม่พบ staff (ลืมใส่ JwtAuthGuard?)');
    }
    return req.staff.shopId;
  },
);
