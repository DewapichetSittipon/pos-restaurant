import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateShopRequestDto } from './dto/create-shop-request.dto';

@Injectable()
export class ShopRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  // ร้านส่งคำขอเปิดร้านจากหน้า public (ไม่ต้อง login)
  // กันสแปม: เบอร์เดียวกันที่ยัง pending ภายใน 24 ชม. ส่งซ้ำไม่ได้
  async submit(dto: CreateShopRequestDto) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const duplicate = await this.prisma.shopRequest.findFirst({
      where: { phone: dto.phone, status: 'pending', createdAt: { gte: since } },
    });
    if (duplicate) {
      throw new HttpException(
        'มีคำขอจากเบอร์นี้อยู่แล้ว ทีมงานจะติดต่อกลับเร็วๆ นี้',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const request = await this.prisma.shopRequest.create({
      data: {
        shopName: dto.shopName,
        contactName: dto.contactName,
        phone: dto.phone,
        note: dto.note,
      },
    });
    // ตอบกลับเฉพาะ field ที่ปลอดภัย (ไม่ leak สถานะ/หมายเหตุ admin)
    return { id: request.id, status: request.status };
  }
}
