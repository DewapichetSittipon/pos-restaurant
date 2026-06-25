import { BadRequestException, Injectable } from '@nestjs/common';
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
}
