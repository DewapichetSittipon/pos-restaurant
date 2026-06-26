import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Shift } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// สรุปยอดของกะ — เงินสด/โอน, เงินที่ควรมีในลิ้นชัก, ส่วนต่าง (over/short)
export interface ShiftSummary {
  billCount: number;
  cashSatang: number; // ยอดบิลที่จ่ายเงินสดในกะนี้
  transferSatang: number; // ยอดบิลที่จ่ายโอนในกะนี้
  totalSatang: number; // cash + transfer
  expectedCashSatang: number; // เงินสดที่ควรมีในลิ้นชัก = เงินตั้งต้น + ยอดเงินสด
  // มีเฉพาะกะที่ปิดแล้ว: ผลต่างเงินที่นับได้ - ที่ควรมี (บวก = เกิน, ลบ = ขาด)
  countedCashSatang: number | null;
  diffSatang: number | null;
}

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  // รวมยอดบิลที่ paid ภายใต้กะนี้ แยกตามวิธีชำระ
  private async summarize(shift: Shift): Promise<ShiftSummary> {
    const bills = await this.prisma.bill.findMany({
      where: { shiftId: shift.id, status: 'paid' },
      select: { totalPrice: true, paymentMethod: true },
    });
    let cashSatang = 0;
    let transferSatang = 0;
    for (const b of bills) {
      const amount = b.totalPrice ?? 0;
      if (b.paymentMethod === 'cash') cashSatang += amount;
      else if (b.paymentMethod === 'transfer') transferSatang += amount;
    }
    const expectedCashSatang = shift.openingCash + cashSatang;
    const counted = shift.closingCashCounted;
    return {
      billCount: bills.length,
      cashSatang,
      transferSatang,
      totalSatang: cashSatang + transferSatang,
      expectedCashSatang,
      countedCashSatang: counted ?? null,
      diffSatang: counted != null ? counted - expectedCashSatang : null,
    };
  }

  private withSummary(shift: Shift, summary: ShiftSummary) {
    return { ...shift, summary };
  }

  // กะที่เปิดอยู่ของร้าน (+ สรุปยอดสด) — null ถ้าไม่มีกะเปิดอยู่
  async current(shopId: number) {
    const shift = await this.prisma.shift.findFirst({
      where: { shopId, status: 'open' },
    });
    if (!shift) return { shift: null };
    return { shift: this.withSummary(shift, await this.summarize(shift)) };
  }

  // เปิดกะ — 409 ถ้ามีกะเปิดอยู่แล้ว (หนึ่งร้านเปิดได้ทีละกะ)
  async open(
    shopId: number,
    staff: { id: number; username: string },
    openingCash: number,
  ) {
    const existing = await this.prisma.shift.findFirst({
      where: { shopId, status: 'open' },
    });
    if (existing) {
      throw new ConflictException('มีกะที่เปิดอยู่แล้ว — ปิดกะเดิมก่อน');
    }
    const shift = await this.prisma.shift.create({
      data: {
        shopId,
        openingCash,
        openedByStaffId: staff.id,
        openedByName: staff.username,
      },
    });
    return this.withSummary(shift, await this.summarize(shift));
  }

  // ปิดกะ — กระทบยอด: บันทึกเงินที่นับได้จริง + คำนวณส่วนต่าง
  async close(
    shopId: number,
    staff: { id: number; username: string },
    closingCashCounted: number,
    note?: string,
  ) {
    const open = await this.prisma.shift.findFirst({
      where: { shopId, status: 'open' },
    });
    if (!open) {
      throw new NotFoundException('ไม่มีกะที่เปิดอยู่');
    }
    const shift = await this.prisma.shift.update({
      where: { id: open.id },
      data: {
        status: 'closed',
        closingCashCounted,
        closedByStaffId: staff.id,
        closedByName: staff.username,
        closedAt: new Date(),
        note: note?.trim() || null,
      },
    });
    return this.withSummary(shift, await this.summarize(shift));
  }

  // ประวัติกะล่าสุด (รวมกะที่เปิดอยู่) — พร้อมสรุปยอดของแต่ละกะ
  async list(shopId: number, limit = 30) {
    const shifts = await this.prisma.shift.findMany({
      where: { shopId },
      orderBy: { openedAt: 'desc' },
      take: limit,
    });
    return Promise.all(
      shifts.map(async (s) => this.withSummary(s, await this.summarize(s))),
    );
  }
}
