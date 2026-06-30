import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { SubscriptionService } from '../subscription/subscription.service';
import { PLAN_FEATURES } from '../common/plan-access';

const TZ = 'Asia/Bangkok';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notify: NotificationService,
    private readonly subscription: SubscriptionService,
  ) {}

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
    // จองโต๊ะ = ฟีเจอร์ของแพ็กเกจโปรขึ้นไป
    await this.subscription.assertFeature(shopId, PLAN_FEATURES.reservations);
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
    const created = await this.prisma.reservation.create({
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

    // แจ้งเตือนการจองใหม่ (best-effort — ไม่กระทบการบันทึกจอง)
    const when = new Intl.DateTimeFormat('th-TH', {
      timeZone: TZ,
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(reservedAt);
    void this.notify.notify(
      '📅 มีการจองโต๊ะใหม่',
      `${created.customerName} • ${created.partySize} ท่าน • ${when}` +
        (created.table ? ` • โต๊ะ ${created.table.tableNumber}` : '') +
        (created.phone ? ` • โทร ${created.phone}` : ''),
    );
    return created;
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
