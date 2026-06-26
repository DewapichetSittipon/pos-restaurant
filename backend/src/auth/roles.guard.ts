import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { StaffRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import type { RequestWithStaff } from './auth.types';

// ตรวจบทบาทพนักงานตามที่ @Roles() ระบุ — ต้องวางต่อจาก JwtAuthGuard (อ่าน req.staff.role)
// ถ้า handler ไม่ได้ใส่ @Roles ถือว่าทุกบทบาทเข้าได้
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<StaffRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }
    const req = context.switchToHttp().getRequest<RequestWithStaff>();
    const role = req.staff?.role;
    if (!role || !required.includes(role)) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ใช้งานส่วนนี้');
    }
    return true;
  }
}
