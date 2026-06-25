import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // หมวดหมู่ของร้าน + จำนวนเมนู (ไม่นับที่ archived)
  async list(shopId: number) {
    const categories = await this.prisma.category.findMany({
      where: { shopId },
      orderBy: { id: 'asc' },
      include: {
        _count: { select: { menus: { where: { isArchived: false } } } },
      },
    });
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      menuCount: c._count.menus,
    }));
  }

  create(shopId: number, name: string) {
    return this.prisma.category.create({
      data: { shopId, name: name.trim() },
    });
  }

  async rename(shopId: number, id: number, name: string) {
    await this.assertOwned(shopId, id);
    return this.prisma.category.update({
      where: { id },
      data: { name: name.trim() },
    });
  }

  // ลบหมวด — ลบได้เฉพาะหมวดที่ไม่มีเมนูอ้างอิงเลย
  // เมนูที่ archived ยังถือ FK หมวดไว้ (เก็บเพื่อประวัติบิล) จึงลบหมวดที่เคยมีเมนูไม่ได้
  async remove(shopId: number, id: number) {
    await this.assertOwned(shopId, id);
    const [activeMenus, totalMenus] = await Promise.all([
      this.prisma.menu.count({ where: { categoryId: id, isArchived: false } }),
      this.prisma.menu.count({ where: { categoryId: id } }),
    ]);
    if (activeMenus > 0) {
      throw new ConflictException(
        'ลบไม่ได้: ยังมีเมนูในหมวดนี้ (ลบหรือย้ายเมนูออกก่อน)',
      );
    }
    if (totalMenus > 0) {
      throw new ConflictException(
        'ลบไม่ได้: หมวดนี้มีเมนูที่ถูกลบไปแล้วอ้างอิงอยู่ (เก็บไว้เพื่อประวัติบิล)',
      );
    }
    await this.prisma.category.delete({ where: { id } });
    return { ok: true };
  }

  private async assertOwned(shopId: number, id: number): Promise<void> {
    const found = await this.prisma.category.findFirst({
      where: { id, shopId },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException('ไม่พบหมวดหมู่');
    }
  }
}
