import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload, RequestWithStaff } from './auth.types';

export const ACCESS_TOKEN_COOKIE = 'access_token';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithStaff>();
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined;
    if (!token) {
      throw new UnauthorizedException('ต้องเข้าสู่ระบบก่อน');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('โทเคนไม่ถูกต้องหรือหมดอายุ');
    }
    // กัน token ที่ไม่ใช่ของ staff (เช่น platform admin ที่ไม่มี shopId)
    if (typeof payload.shopId !== 'number') {
      throw new UnauthorizedException('โทเคนไม่ใช่ของพนักงานร้าน');
    }

    // ยืนยันว่า staff ยังมีอยู่จริง และใช้ shopId ปัจจุบันจาก DB
    // (กัน token ค้างหลัง reseed/ลบบัญชี ที่ทำให้ shopId อ้างถึงร้านที่ไม่มีแล้ว -> FK error)
    const staff = await this.prisma.staff.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, shopId: true },
    });
    if (!staff) {
      throw new UnauthorizedException(
        'บัญชีนี้ไม่มีอยู่แล้ว กรุณาเข้าสู่ระบบใหม่',
      );
    }

    req.staff = {
      sub: staff.id,
      username: staff.username,
      shopId: staff.shopId,
    };
    return true;
  }
}
