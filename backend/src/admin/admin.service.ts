import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../uploads/storage.service';
import type { PlatformAdminJwtPayload } from './admin.types';
import type { CreateShopDto } from './dto/create-shop.dto';
import type { SetShopPlanDto } from './dto/set-shop-plan.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly storage: StorageService,
  ) {}

  async login(username: string, password: string): Promise<{
    token: string;
    admin: { id: number; username: string };
  }> {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { username },
    });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
    const payload: PlatformAdminJwtPayload = {
      sub: admin.id,
      username: admin.username,
      kind: 'platform',
    };
    return {
      token: await this.jwt.signAsync(payload),
      admin: { id: admin.id, username: admin.username },
    };
  }

  // สร้างร้าน + staff คนแรก ภายใน transaction ที่ส่งเข้ามา (reuse ได้ทั้ง createShop และ approve คำขอ)
  private async createShopAndStaff(
    tx: Prisma.TransactionClient,
    dto: CreateShopDto,
  ) {
    const passwordHash = await bcrypt.hash(dto.staffPassword, 10);
    const shop = await tx.shop.create({
      // admin สร้างเอง = เปิดใช้งานทันที (ไม่ต้องรออนุมัติ)
      data: { name: dto.shopName, slug: dto.slug, status: 'active' },
    });
    const staff = await tx.staff.create({
      data: {
        shopId: shop.id,
        username: dto.staffUsername,
        passwordHash,
        role: 'OWNER', // staff คนแรกที่ admin สร้าง = เจ้าของร้าน
      },
    });
    return {
      shop,
      staff: { id: staff.id, username: staff.username, shopId: shop.id },
    };
  }

  // แปลง P2002 (unique constraint) เป็นข้อความ slug/username ซ้ำ
  private rethrowShopConflict(err: unknown): never {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      const target = (err.meta?.target as string[] | undefined)?.join(', ');
      throw new ConflictException(
        target?.includes('slug')
          ? 'slug นี้ถูกใช้แล้ว'
          : 'ชื่อผู้ใช้นี้ถูกใช้แล้ว',
      );
    }
    throw err;
  }

  // สร้างร้านใหม่ + staff คนแรกของร้าน ในทรานแซกชันเดียว
  async createShop(dto: CreateShopDto) {
    try {
      return await this.prisma.$transaction((tx) =>
        this.createShopAndStaff(tx, dto),
      );
    } catch (err) {
      this.rethrowShopConflict(err);
    }
  }

  // ลบร้าน + ข้อมูลทั้งหมดของร้าน (hard delete) — ลบลูกตามลำดับ FK ในทรานแซกชันเดียว
  async deleteShop(shopId: number) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('ไม่พบร้าน');
    }

    // เก็บ path รูปไว้ลบไฟล์หลังลบ record สำเร็จ
    const menus = await this.prisma.menu.findMany({
      where: { shopId, imageUrl: { not: null } },
      select: { imageUrl: true },
    });

    await this.prisma.$transaction([
      this.prisma.serviceRequest.deleteMany({ where: { bill: { shopId } } }),
      this.prisma.orderItem.deleteMany({ where: { bill: { shopId } } }),
      this.prisma.bill.deleteMany({ where: { shopId } }),
      this.prisma.menu.deleteMany({ where: { shopId } }),
      this.prisma.category.deleteMany({ where: { shopId } }),
      this.prisma.table.deleteMany({ where: { shopId } }),
      this.prisma.staff.deleteMany({ where: { shopId } }),
      this.prisma.shop.delete({ where: { id: shopId } }),
    ]);

    // ลบรูปเมนูจาก Supabase Storage (best-effort)
    await Promise.all(menus.map((m) => this.storage.remove(m.imageUrl)));

    return { ok: true, deletedShop: shop.name };
  }

  // รายการร้านทั้งหมด + จำนวน staff/โต๊ะ + แพ็กเกจ/สถานะจ่ายเงิน
  async listShops() {
    const shops = await this.prisma.shop.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { staff: true, tables: true } },
        plan: { select: { key: true, name: true } },
      },
    });
    return shops.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      status: s.status,
      contactName: s.contactName,
      phone: s.phone,
      createdAt: s.createdAt,
      staffCount: s._count.staff,
      tableCount: s._count.tables,
      planKey: s.plan?.key ?? null, // null = ยังไม่ผูก plan (ถือเป็นฟรี)
      planName: s.plan?.name ?? null,
      subscriptionStatus: s.subscriptionStatus,
      currentPeriodEnd: s.currentPeriodEnd,
      requestedPlanKey: s.requestedPlanKey, // คำขออัปเกรดที่รออนุมัติ (null = ไม่มี)
    }));
  }

  // แพ็กเกจทั้งหมด (ให้ admin เลือกตอนเปลี่ยน plan ของร้าน)
  listPlans() {
    return this.prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  // admin เปลี่ยนแพ็กเกจ/รอบจ่ายของร้าน (manual หลังร้านโอน) — อ้าง Plan ด้วย key
  async setShopPlan(shopId: number, dto: SetShopPlanDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('ไม่พบร้าน');
    }
    const plan = await this.prisma.plan.findUnique({
      where: { key: dto.planKey },
    });
    if (!plan) {
      throw new NotFoundException('ไม่พบแพ็กเกจที่ระบุ');
    }
    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        planId: plan.id,
        subscriptionStatus: dto.subscriptionStatus ?? 'active',
        currentPeriodEnd: dto.currentPeriodEnd
          ? new Date(dto.currentPeriodEnd)
          : null,
        requestedPlanKey: null, // อนุมัติ/เปลี่ยน plan แล้ว เคลียร์คำขอที่ค้าง
      },
      include: { plan: { select: { key: true, name: true } } },
    });
  }

  // ปฏิเสธคำขออัปเกรดของร้าน (เคลียร์คำขอ ไม่เปลี่ยน plan)
  async rejectPlanRequest(shopId: number) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('ไม่พบร้าน');
    }
    return this.prisma.shop.update({
      where: { id: shopId },
      data: { requestedPlanKey: null },
    });
  }

  // อนุมัติร้านที่สมัครเอง -> เปลี่ยนสถานะ pending เป็น active (ปฏิเสธ = ลบร้านผ่าน deleteShop)
  async approveShop(shopId: number) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('ไม่พบร้าน');
    }
    if (shop.status === 'active') {
      throw new ConflictException('ร้านนี้เปิดใช้งานอยู่แล้ว');
    }
    return this.prisma.shop.update({
      where: { id: shopId },
      data: { status: 'active' },
    });
  }

  // พนักงานของร้าน (ให้ admin เลือกตอน reset รหัส กรณีร้านล็อกตัวเองออก)
  async listShopStaff(shopId: number) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('ไม่พบร้าน');
    }
    return this.prisma.staff.findMany({
      where: { shopId },
      orderBy: { id: 'asc' },
      select: { id: true, username: true },
    });
  }

  // admin รีเซ็ตรหัสผ่านพนักงาน (ข้ามร้านได้ — กู้กรณีลืมรหัสทั้งร้าน)
  async resetStaffPassword(staffId: number, password: string) {
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      throw new NotFoundException('ไม่พบพนักงาน');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.staff.update({
      where: { id: staffId },
      data: { passwordHash },
    });
    return { ok: true, username: staff.username };
  }
}
