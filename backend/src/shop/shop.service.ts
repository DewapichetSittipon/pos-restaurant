import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShopDto } from './dto/update-shop.dto';

// ฟิลด์ที่ใช้ทำหัวใบเสร็จ + แก้ในหน้าจัดการร้าน
const SHOP_SELECT = {
  id: true,
  name: true,
  address: true,
  phone: true,
  taxId: true,
} as const;

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  async get(shopId: number) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: SHOP_SELECT,
    });
    if (!shop) {
      throw new NotFoundException('ไม่พบร้าน');
    }
    return shop;
  }

  // ช่องว่าง -> null (ไม่อยากเก็บ string ว่างใน DB; ใบเสร็จเช็ค null เพื่อซ่อนบรรทัด)
  update(shopId: number, dto: UpdateShopDto) {
    const clean = (v?: string): string | null => {
      const trimmed = v?.trim();
      return trimmed ? trimmed : null;
    };
    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        name: dto.name.trim(),
        address: clean(dto.address),
        phone: clean(dto.phone),
        taxId: clean(dto.taxId),
      },
      select: SHOP_SELECT,
    });
  }
}
