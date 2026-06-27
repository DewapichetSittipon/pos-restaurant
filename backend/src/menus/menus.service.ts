import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../uploads/storage.service';
import type {
  CreateMenuDto,
  UpdateMenuDto,
  ModifierGroupInput,
} from './dto/menu.dto';
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  MIME_EXT,
  type UploadedImageFile,
} from '../uploads/uploads.constants';

@Injectable()
export class MenusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  // แคตตาล็อกเมนูของร้านหนึ่ง แยกตามหมวด (ไม่รวมเมนูที่ archived)
  // availability ฝั่ง client คำนวณจาก isAvailable && (stockCount == null || stockCount > 0)
  catalog(shopId: number) {
    return this.prisma.category.findMany({
      where: { shopId },
      orderBy: { id: 'asc' },
      include: {
        menus: {
          where: { isArchived: false },
          orderBy: { id: 'asc' },
          include: {
            modifierGroups: {
              orderBy: { sortOrder: 'asc' },
              include: { options: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
      },
    });
  }

  // แทนที่ชุดตัวเลือกทั้งหมดของเมนู (ลบของเดิม สร้างใหม่ทั้งก้อน) — ง่ายต่อฟอร์มจัดการ
  // ปลอดภัยกับประวัติ: OrderItemModifier เป็น snapshot ไม่ผูก FK กับ ModifierOption
  async setMenuModifiers(shopId: number, menuId: number, groups: ModifierGroupInput[]) {
    const menu = await this.prisma.menu.findFirst({ where: { id: menuId, shopId } });
    if (!menu) {
      throw new NotFoundException('ไม่พบเมนู');
    }
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.modifierGroup.findMany({
        where: { menuId },
        select: { id: true },
      });
      const groupIds = existing.map((g) => g.id);
      if (groupIds.length > 0) {
        await tx.modifierOption.deleteMany({ where: { groupId: { in: groupIds } } });
        await tx.modifierGroup.deleteMany({ where: { id: { in: groupIds } } });
      }
      for (const [gi, g] of groups.entries()) {
        await tx.modifierGroup.create({
          data: {
            menuId,
            name: g.name.trim(),
            minSelect: g.minSelect,
            maxSelect: g.maxSelect,
            sortOrder: gi,
            options: {
              create: g.options.map((o, oi) => ({
                name: o.name.trim(),
                priceDelta: o.priceDelta,
                isAvailable: o.isAvailable ?? true,
                sortOrder: oi,
              })),
            },
          },
        });
      }
      return tx.modifierGroup.findMany({
        where: { menuId },
        orderBy: { sortOrder: 'asc' },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      });
    });
  }

  // เพิ่มเมนูใหม่ — categoryId ต้องเป็นของร้านนี้
  async create(shopId: number, dto: CreateMenuDto) {
    await this.assertCategoryOwned(shopId, dto.categoryId);
    return this.prisma.menu.create({
      data: {
        shopId,
        categoryId: dto.categoryId,
        name: dto.name.trim(),
        price: dto.price, // สตางค์
        stockCount: dto.stockCount ?? null,
      },
    });
  }

  // แก้ไขเมนู (verify ownership ก่อน) — เปลี่ยนหมวดได้ถ้าหมวดใหม่เป็นของร้านเดียวกัน
  async update(shopId: number, id: number, dto: UpdateMenuDto) {
    const menu = await this.prisma.menu.findFirst({ where: { id, shopId } });
    if (!menu) {
      throw new NotFoundException('ไม่พบเมนู');
    }
    if (dto.categoryId !== undefined) {
      await this.assertCategoryOwned(shopId, dto.categoryId);
    }
    return this.prisma.menu.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name?.trim(),
        price: dto.price,
        stockCount: dto.stockCount, // null = เลิกนับสต็อก
        isAvailable: dto.isAvailable,
      },
    });
  }

  // "ลบ" = soft delete (รักษา FK ของ OrderItem ในบิลย้อนหลัง — ดู CONTEXT.md)
  async archive(shopId: number, id: number) {
    const menu = await this.prisma.menu.findFirst({ where: { id, shopId } });
    if (!menu) {
      throw new NotFoundException('ไม่พบเมนู');
    }
    await this.prisma.menu.update({
      where: { id },
      data: { isArchived: true },
    });
    return { ok: true };
  }

  // อัปโหลด/แทนที่รูปเมนู — เก็บที่ Supabase Storage เก็บ public URL ใน imageUrl
  async setImage(shopId: number, id: number, file?: UploadedImageFile) {
    const menu = await this.prisma.menu.findFirst({ where: { id, shopId } });
    if (!menu) {
      throw new NotFoundException('ไม่พบเมนู');
    }
    if (!file) {
      throw new BadRequestException('ไม่พบไฟล์รูป');
    }
    if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
      throw new BadRequestException('รองรับเฉพาะรูป JPG, PNG, WebP');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('ไฟล์ใหญ่เกิน 2MB');
    }

    const path = `menus/${id}-${Date.now()}.${MIME_EXT[file.mimetype]}`;
    const publicUrl = await this.storage.upload(path, file.buffer, file.mimetype);
    await this.storage.remove(menu.imageUrl); // ลบรูปเก่า (ถ้ามี)

    return this.prisma.menu.update({
      where: { id },
      data: { imageUrl: publicUrl },
    });
  }

  async clearImage(shopId: number, id: number) {
    const menu = await this.prisma.menu.findFirst({ where: { id, shopId } });
    if (!menu) {
      throw new NotFoundException('ไม่พบเมนู');
    }
    await this.storage.remove(menu.imageUrl);
    return this.prisma.menu.update({
      where: { id },
      data: { imageUrl: null },
    });
  }

  private async assertCategoryOwned(shopId: number, categoryId: number): Promise<void> {
    const cat = await this.prisma.category.findFirst({
      where: { id: categoryId, shopId },
      select: { id: true },
    });
    if (!cat) {
      throw new BadRequestException('หมวดหมู่ไม่ถูกต้อง (ไม่ใช่ของร้านนี้)');
    }
  }
}
