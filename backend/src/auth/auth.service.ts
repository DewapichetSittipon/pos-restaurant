import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
    staff: { id: number; username: string; shopId: number };
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
      },
    };
  }
}
