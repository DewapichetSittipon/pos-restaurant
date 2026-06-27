import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import type { SignupDto } from './dto/signup.dto';

@Injectable()
export class SignupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotificationService,
  ) {}

  // ร้านสมัครเอง -> สร้าง Shop (pending) + Staff ในทรานแซกชันเดียว
  // ร้านตั้ง username/password เอง แล้ว login เข้าไปเห็นหน้า "รออนุมัติ" ทันที
  async register(dto: SignupDto) {
    const slug = await this.uniqueSlug(dto.shopName);
    const passwordHash = await bcrypt.hash(dto.staffPassword, 10);
    try {
      await this.prisma.$transaction(async (tx) => {
        const shop = await tx.shop.create({
          data: {
            name: dto.shopName,
            slug,
            status: 'pending',
            contactName: dto.contactName,
            phone: dto.phone,
          },
        });
        await tx.staff.create({
          data: {
            shopId: shop.id,
            username: dto.staffUsername,
            passwordHash,
            role: 'OWNER', // ผู้สมัคร = เจ้าของร้าน
          },
        });
      });
      // แจ้งผู้ดูแลแพลตฟอร์มว่ามีร้านใหม่รออนุมัติ (best-effort ไม่ block การสมัคร)
      void this.notify.notify(
        '🏪 ร้านใหม่รออนุมัติ',
        `ร้าน "${dto.shopName}" (ผู้ติดต่อ: ${dto.contactName ?? '-'}, โทร: ${dto.phone ?? '-'}) สมัครเข้ามาแล้ว รอการอนุมัติในหน้า /platform`,
      );
      return { ok: true };
    } catch (err) {
      // username ซ้ำทั้งระบบ -> ให้ร้านเลือกใหม่
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('ชื่อผู้ใช้นี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น');
      }
      throw err;
    }
  }

  // สร้าง slug จากชื่อร้าน + กันชนด้วยเลขท้าย (slug ต้อง unique)
  private async uniqueSlug(name: string): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'shop';
    let slug = base;
    let n = 1;
    while (await this.prisma.shop.findUnique({ where: { slug } })) {
      n += 1;
      slug = `${base}-${n}`;
    }
    return slug;
  }
}
