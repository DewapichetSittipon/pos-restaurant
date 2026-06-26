import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

const TZ = 'Asia/Bangkok';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  private bangkokToday(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  }

  // รายการจองของวัน (ตามเขตเวลาไทย) — ค่าเริ่มต้น = วันนี้
  async list(shopId: number, dateStr?: string) {
    const date = dateStr ?? this.bangkokToday();
    const start = new Date(`${date}T00:00:00+07:00`);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)');
    }
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    return this.prisma.reservation.findMany({
      where: { shopId, reservedAt: { gte: start, lt: end } },
      include: { table: { select: { id: true, tableNumber: true } } },
      orderBy: { reservedAt: 'asc' },
    });
  }

  async create(shopId: number, dto: CreateReservationDto) {
    // ถ้าระบุโต๊ะ ต้องเป็นโต๊ะของร้านนี้
    if (dto.tableId != null) {
      const table = await this.prisma.table.findFirst({
        where: { id: dto.tableId, shopId },
      });
      if (!table) throw new NotFoundException('ไม่พบโต๊ะที่ระบุ');
    }
    const reservedAt = new Date(dto.reservedAt);
    if (Number.isNaN(reservedAt.getTime())) {
      throw new BadRequestException('วันเวลาที่นัดไม่ถูกต้อง');
    }
    return this.prisma.reservation.create({
      data: {
        shopId,
        customerName: dto.customerName.trim(),
        phone: dto.phone?.trim() || null,
        partySize: dto.partySize,
        reservedAt,
        tableId: dto.tableId ?? null,
        note: dto.note?.trim() || null,
      },
      include: { table: { select: { id: true, tableNumber: true } } },
    });
  }

  async updateStatus(
    shopId: number,
    id: number,
    status: 'seated' | 'cancelled',
  ) {
    const existing = await this.prisma.reservation.findFirst({
      where: { id, shopId },
    });
    if (!existing) throw new NotFoundException('ไม่พบการจอง');
    return this.prisma.reservation.update({
      where: { id },
      data: { status },
      include: { table: { select: { id: true, tableNumber: true } } },
    });
  }

  async remove(shopId: number, id: number) {
    const existing = await this.prisma.reservation.findFirst({
      where: { id, shopId },
    });
    if (!existing) throw new NotFoundException('ไม่พบการจอง');
    await this.prisma.reservation.delete({ where: { id } });
    return { ok: true };
  }
}
