import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ADMIN_TOKEN_COOKIE,
  type PlatformAdminJwtPayload,
  type RequestWithAdmin,
} from './admin.types';

// ตรวจ token ของ platform admin (cookie แยกจาก staff) + ต้อง kind = 'platform'
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithAdmin>();
    const token = req.cookies?.[ADMIN_TOKEN_COOKIE] as string | undefined;
    if (!token) {
      throw new UnauthorizedException('ต้องเข้าสู่ระบบผู้ดูแลก่อน');
    }
    try {
      const payload = this.jwt.verify<PlatformAdminJwtPayload>(token);
      if (payload.kind !== 'platform') {
        throw new UnauthorizedException('โทเคนไม่ใช่ของผู้ดูแลแพลตฟอร์ม');
      }
      req.admin = payload;
      return true;
    } catch {
      throw new UnauthorizedException('โทเคนไม่ถูกต้องหรือหมดอายุ');
    }
  }
}
