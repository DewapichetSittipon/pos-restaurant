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
      data: { name: dto.shopName, slug: dto.slug },
    });
    const staff = await tx.staff.create({
      data: { shopId: shop.id, username: dto.staffUsername, passwordHash },
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

  // รายการร้านทั้งหมด + จำนวน staff/โต๊ะ
  async listShops() {
    const shops = await this.prisma.shop.findMany({
      orderBy: { id: 'asc' },
      include: { _count: { select: { staff: true, tables: true } } },
    });
    return shops.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      createdAt: s.createdAt,
      staffCount: s._count.staff,
      tableCount: s._count.tables,
    }));
  }

  // คำขอเปิดร้านทั้งหมด — pending ก่อน แล้วเรียงใหม่สุดขึ้นก่อน
  async listShopRequests() {
    return this.prisma.shopRequest.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  // อนุมัติคำขอ -> สร้างร้าน + staff + ผูก createdShopId ในทรานแซกชันเดียว
  async approveShopRequest(id: number, dto: CreateShopDto) {
    const request = await this.prisma.shopRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('ไม่พบคำขอ');
    }
    if (request.status !== 'pending') {
      throw new ConflictException('คำขอนี้ถูกดำเนินการไปแล้ว');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const result = await this.createShopAndStaff(tx, dto);
        await tx.shopRequest.update({
          where: { id },
          data: {
            status: 'approved',
            createdShopId: result.shop.id,
            reviewedAt: new Date(),
          },
        });
        return result;
      });
    } catch (err) {
      this.rethrowShopConflict(err);
    }
  }

  // ปฏิเสธคำขอ (เก็บเหตุผลไว้ใน adminNote)
  async rejectShopRequest(id: number, adminNote?: string) {
    const request = await this.prisma.shopRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('ไม่พบคำขอ');
    }
    if (request.status !== 'pending') {
      throw new ConflictException('คำขอนี้ถูกดำเนินการไปแล้ว');
    }
    return this.prisma.shopRequest.update({
      where: { id },
      data: { status: 'rejected', adminNote, reviewedAt: new Date() },
    });
  }
}
