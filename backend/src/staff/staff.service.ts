import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  // พนักงานทั้งหมดของร้าน (scope ด้วย shopId เสมอ)
  listStaff(shopId: number) {
    return this.prisma.staff.findMany({
      where: { shopId },
      orderBy: { id: 'asc' },
      select: { id: true, username: true },
    });
  }

  // เพิ่มพนักงานใหม่ในร้านตัวเอง
  async createStaff(shopId: number, username: string, password: string) {
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const staff = await this.prisma.staff.create({
        data: { shopId, username, passwordHash },
        select: { id: true, username: true },
      });
      return staff;
    } catch (err) {
      // username unique ทั้งระบบ
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('ชื่อผู้ใช้นี้ถูกใช้แล้ว');
      }
      throw err;
    }
  }

  // ลบพนักงาน — ห้ามลบตัวเอง และห้ามลบคนสุดท้าย (ไม่งั้นร้านจะ login ไม่ได้)
  async deleteStaff(shopId: number, staffId: number, currentStaffId: number) {
    if (staffId === currentStaffId) {
      throw new BadRequestException('ลบบัญชีตัวเองไม่ได้');
    }
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, shopId },
    });
    if (!staff) {
      throw new NotFoundException('ไม่พบพนักงาน');
    }
    const count = await this.prisma.staff.count({ where: { shopId } });
    if (count <= 1) {
      throw new BadRequestException('ต้องมีพนักงานอย่างน้อย 1 คน');
    }
    await this.prisma.staff.delete({ where: { id: staffId } });
    return { ok: true };
  }

  // รีเซ็ตรหัสผ่านของเพื่อนร่วมร้าน (เช่น พนักงานลืมรหัส) — scope ด้วย shopId
  async setPassword(shopId: number, staffId: number, password: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, shopId },
    });
    if (!staff) {
      throw new NotFoundException('ไม่พบพนักงาน');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.staff.update({
      where: { id: staffId },
      data: { passwordHash },
    });
    return { ok: true };
  }
}
