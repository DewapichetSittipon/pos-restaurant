import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { RequestWithStaff } from './auth.types';

// กันร้านที่ยัง pending ไม่ให้ใช้งาน endpoint ข้อมูล (login ได้ แต่ทำอะไรไม่ได้จนกว่าจะอนุมัติ)
// ต้องวางต่อจาก JwtAuthGuard เสมอ (อ่าน shopStatus ที่ guard นั้นแนบไว้บน req.staff)
@Injectable()
export class ActiveShopGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithStaff>();
    if (req.staff?.shopStatus !== 'active') {
      throw new ForbiddenException('ร้านนี้กำลังรอการอนุมัติจากผู้ดูแลระบบ');
    }
    return true;
  }
}
