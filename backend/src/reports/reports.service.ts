import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const TZ = 'Asia/Bangkok';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // วันที่วันนี้ตามเขตเวลาไทย (YYYY-MM-DD)
  private bangkokToday(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  }

  // EOD: รวมยอดบิลที่ paid ของร้านนี้ group ตาม paid_at ในเขตเวลา Asia/Bangkok (ADR-0007)
  async eod(shopId: number, dateStr?: string) {
    const date = dateStr ?? this.bangkokToday();
    // Bangkok = UTC+7 (ไม่มี DST) จึง fix offset ได้
    const start = new Date(`${date}T00:00:00+07:00`);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)');
    }
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const bills = await this.prisma.bill.findMany({
      where: { shopId, status: 'paid', paidAt: { gte: start, lt: end } },
      include: { table: true },
      orderBy: { paidAt: 'asc' },
    });

    const totalSatang = bills.reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);

    return {
      date,
      timezone: TZ,
      billCount: bills.length,
      totalSatang,
      bills: bills.map((b) => ({
        id: b.id,
        tableNumber: b.table.tableNumber,
        totalSatang: b.totalPrice ?? 0,
        paidAt: b.paidAt,
      })),
    };
  }

  // รายละเอียดบิลย้อนหลัง — รายการเมนูที่สั่ง จัดกลุ่มตามหมวด (scope ตามร้าน)
  // ไม่นับรายการที่ถูกยกเลิก (voided) เพื่อให้ยอดตรงกับยอดบิล
  async billDetail(shopId: number, billId: number) {
    const bill = await this.prisma.bill.findFirst({
      where: { id: billId, shopId },
      include: {
        table: true,
        orderItems: {
          where: { status: { not: 'voided' } },
          include: { menu: { include: { category: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!bill) throw new NotFoundException('ไม่พบบิล');

    // จัดกลุ่มตามหมวด (คงลำดับหมวดตามที่รายการแรกของหมวดถูกสั่ง)
    const groups = new Map<
      number,
      {
        categoryId: number;
        categoryName: string;
        items: {
          id: number;
          itemName: string;
          quantity: number;
          unitPrice: number;
          lineSatang: number;
        }[];
        subtotalSatang: number;
      }
    >();

    for (const oi of bill.orderItems) {
      const cat = oi.menu.category;
      let group = groups.get(cat.id);
      if (!group) {
        group = {
          categoryId: cat.id,
          categoryName: cat.name,
          items: [],
          subtotalSatang: 0,
        };
        groups.set(cat.id, group);
      }
      const lineSatang = oi.unitPrice * oi.quantity;
      group.items.push({
        id: oi.id,
        itemName: oi.itemName,
        quantity: oi.quantity,
        unitPrice: oi.unitPrice,
        lineSatang,
      });
      group.subtotalSatang += lineSatang;
    }

    return {
      billId: bill.id,
      tableNumber: bill.table.tableNumber,
      paidAt: bill.paidAt,
      totalSatang: bill.totalPrice ?? 0,
      categories: [...groups.values()],
    };
  }
}
