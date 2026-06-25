import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateMenuDto, UpdateMenuDto } from './dto/menu.dto';
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  MIME_EXT,
  UPLOADS_DIR,
  type UploadedImageFile,
} from '../uploads/uploads.constants';

@Injectable()
export class MenusService {
  constructor(private readonly prisma: PrismaService) {}

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
        },
      },
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

  // อัปโหลด/แทนที่รูปเมนู — เซฟไฟล์ลงดิสก์ เก็บ path ใน imageUrl
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

    const filename = `${id}-${Date.now()}.${MIME_EXT[file.mimetype]}`;
    await writeFile(join(UPLOADS_DIR, 'menus', filename), file.buffer);
    await this.removeImageFile(menu.imageUrl); // ลบรูปเก่า (ถ้ามี)

    return this.prisma.menu.update({
      where: { id },
      data: { imageUrl: `/uploads/menus/${filename}` },
    });
  }

  async clearImage(shopId: number, id: number) {
    const menu = await this.prisma.menu.findFirst({ where: { id, shopId } });
    if (!menu) {
      throw new NotFoundException('ไม่พบเมนู');
    }
    await this.removeImageFile(menu.imageUrl);
    return this.prisma.menu.update({
      where: { id },
      data: { imageUrl: null },
    });
  }

  // ลบไฟล์รูปออกจากดิสก์ (best-effort — ไม่ขัดจังหวะถ้าไฟล์หายไปแล้ว)
  private async removeImageFile(imageUrl: string | null): Promise<void> {
    if (!imageUrl) return;
    const filename = imageUrl.split('/').pop();
    if (!filename) return;
    await unlink(join(UPLOADS_DIR, 'menus', filename)).catch(() => undefined);
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
