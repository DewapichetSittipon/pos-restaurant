import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ShopStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string): Promise<{
    token: string;
    staff: {
      id: number;
      username: string;
      shopId: number;
      shopStatus: ShopStatus;
    };
  }> {
    const staff = await this.prisma.staff.findUnique({
      where: { username },
      include: { shop: true },
    });
    if (!staff || !(await bcrypt.compare(password, staff.passwordHash))) {
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
    const payload: JwtPayload = {
      sub: staff.id,
      username: staff.username,
      shopId: staff.shopId,
    };
    return {
      token: await this.jwt.signAsync(payload),
      staff: {
        id: staff.id,
        username: staff.username,
        shopId: staff.shopId,
        shopStatus: staff.shop.status,
      },
    };
  }

  // เปลี่ยนรหัสผ่านของพนักงานที่ล็อกอินอยู่ — ต้องยืนยันรหัสเดิมก่อน
  async changePassword(
    staffId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });
    if (!staff || !(await bcrypt.compare(currentPassword, staff.passwordHash))) {
      throw new UnauthorizedException('รหัสผ่านเดิมไม่ถูกต้อง');
    }
    if (await bcrypt.compare(newPassword, staff.passwordHash)) {
      throw new BadRequestException('รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.staff.update({
      where: { id: staffId },
      data: { passwordHash },
    });
  }
}
