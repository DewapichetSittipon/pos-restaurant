import {
  BadRequestException,
  ConflictException,
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

    // รวมบิลที่คืนเงินด้วย (โชว์ในรายการ ติดป้าย) แต่ไม่นับในยอดขาย
    const bills = await this.prisma.bill.findMany({
      where: {
        shopId,
        status: { in: ['paid', 'refunded'] },
        paidAt: { gte: start, lt: end },
      },
      include: { table: true },
      orderBy: { paidAt: 'asc' },
    });

    const paid = bills.filter((b) => b.status === 'paid');
    const refunded = bills.filter((b) => b.status === 'refunded');

    const totalSatang = paid.reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);
    const vatSatang = paid.reduce((sum, b) => sum + b.vatAmount, 0);
    const serviceChargeSatang = paid.reduce((sum, b) => sum + b.serviceCharge, 0);
    const cashSatang = paid
      .filter((b) => b.paymentMethod === 'cash')
      .reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);
    const transferSatang = paid
      .filter((b) => b.paymentMethod === 'transfer')
      .reduce((sum, b) => sum + (b.totalPrice ?? 0), 0);
    const refundedSatang = refunded.reduce(
      (sum, b) => sum + (b.totalPrice ?? 0),
      0,
    );

    return {
      date,
      timezone: TZ,
      billCount: paid.length,
      totalSatang,
      vatSatang,
      serviceChargeSatang,
      cashSatang,
      transferSatang,
      refundedCount: refunded.length,
      refundedSatang,
      bills: bills.map((b) => ({
        id: b.id,
        tableNumber: b.table.tableNumber,
        totalSatang: b.totalPrice ?? 0,
        paidAt: b.paidAt,
        status: b.status,
      })),
    };
  }

  // ยอดขายรายชั่วโมง (0–23) ของวัน — ช่วยดูช่วงพีค จากบิลที่ paid
  async hourly(shopId: number, dateStr?: string) {
    const date = dateStr ?? this.bangkokToday();
    const start = new Date(`${date}T00:00:00+07:00`);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)');
    }
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const bills = await this.prisma.bill.findMany({
      where: { shopId, status: 'paid', paidAt: { gte: start, lt: end } },
      select: { totalPrice: true, paidAt: true },
    });

    // ชั่วโมงตามเขตเวลาไทย (00–23)
    const hourFmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      hour: '2-digit',
      hour12: false,
    });
    const hours = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      totalSatang: 0,
      billCount: 0,
    }));
    for (const b of bills) {
      if (!b.paidAt) continue;
      // '24' เที่ยงคืน บางที่คืนค่า '24' → mod 24
      const h = parseInt(hourFmt.format(b.paidAt), 10) % 24;
      hours[h].totalSatang += b.totalPrice ?? 0;
      hours[h].billCount += 1;
    }
    return { date, hours };
  }

  // ยอดขายช่วงวันที่ (รายวัน) — รวมต่อวันในเขตเวลาไทย + ยอดรวมทั้งช่วง
  async range(shopId: number, fromStr: string, toStr: string) {
    const from = new Date(`${fromStr}T00:00:00+07:00`);
    const toStart = new Date(`${toStr}T00:00:00+07:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(toStart.getTime())) {
      throw new BadRequestException('รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)');
    }
    const toEnd = new Date(toStart.getTime() + 24 * 60 * 60 * 1000);
    if (from >= toEnd) {
      throw new BadRequestException('ช่วงวันที่ไม่ถูกต้อง (from ต้องไม่เกิน to)');
    }
    const days = Math.round((toEnd.getTime() - from.getTime()) / 86_400_000);
    if (days > 366) {
      throw new BadRequestException('ช่วงวันที่ยาวเกินไป (สูงสุด 366 วัน)');
    }

    const bills = await this.prisma.bill.findMany({
      where: { shopId, status: 'paid', paidAt: { gte: from, lt: toEnd } },
      select: { totalPrice: true, paidAt: true },
    });

    const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
    const buckets = new Map<string, { totalSatang: number; billCount: number }>();
    // เริ่มทุกวันด้วย 0 (รวมวันที่ไม่มียอด)
    for (let i = 0; i < days; i++) {
      const d = dayFmt.format(new Date(from.getTime() + i * 86_400_000));
      buckets.set(d, { totalSatang: 0, billCount: 0 });
    }
    let totalSatang = 0;
    for (const b of bills) {
      if (!b.paidAt) continue;
      const d = dayFmt.format(b.paidAt);
      const row = buckets.get(d) ?? { totalSatang: 0, billCount: 0 };
      row.totalSatang += b.totalPrice ?? 0;
      row.billCount += 1;
      buckets.set(d, row);
      totalSatang += b.totalPrice ?? 0;
    }

    return {
      from: fromStr,
      to: toStr,
      totalSatang,
      billCount: bills.length,
      days: [...buckets.entries()]
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  // ส่งออกบิลในช่วงวันที่เป็น CSV (สำหรับบัญชี/Excel) — รวมบิลที่คืนเงิน (ติดสถานะ)
  async exportCsv(shopId: number, fromStr: string, toStr: string) {
    const from = new Date(`${fromStr}T00:00:00+07:00`);
    const toStart = new Date(`${toStr}T00:00:00+07:00`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(toStart.getTime())) {
      throw new BadRequestException('รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)');
    }
    const toEnd = new Date(toStart.getTime() + 24 * 60 * 60 * 1000);
    if (from >= toEnd) {
      throw new BadRequestException('ช่วงวันที่ไม่ถูกต้อง');
    }

    const bills = await this.prisma.bill.findMany({
      where: {
        shopId,
        status: { in: ['paid', 'refunded'] },
        paidAt: { gte: from, lt: toEnd },
      },
      include: { table: true },
      orderBy: { paidAt: 'asc' },
    });

    const fmt = new Intl.DateTimeFormat('sv-SE', {
      timeZone: TZ,
      dateStyle: 'short',
      timeStyle: 'medium',
    });
    const baht = (satang: number): string => (satang / 100).toFixed(2);
    const methodLabel = (m: string | null): string =>
      m === 'cash' ? 'เงินสด' : m === 'transfer' ? 'เงินโอน' : '';
    const statusLabel = (s: string): string =>
      s === 'refunded' ? 'คืนเงิน' : 'ชำระแล้ว';

    const header = [
      'บิล',
      'วันเวลา',
      'โต๊ะ',
      'สถานะ',
      'วิธีชำระ',
      'ส่วนลด',
      'เซอร์วิสชาร์จ',
      'VAT',
      'ยอดสุทธิ',
    ];
    const rows = bills.map((b) => [
      String(b.id),
      b.paidAt ? fmt.format(b.paidAt) : '',
      b.table.tableNumber,
      statusLabel(b.status),
      methodLabel(b.paymentMethod),
      baht(b.discount),
      baht(b.serviceCharge),
      baht(b.vatAmount),
      baht(b.totalPrice ?? 0),
    ]);

    // escape ตาม RFC4180 + BOM ให้ Excel อ่านภาษาไทยถูก
    const esc = (v: string): string =>
      /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const csv =
      '﻿' +
      [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
    return { filename: `sales_${fromStr}_${toStr}.csv`, csv };
  }

  // เมนูขายดีของวัน — รวมจำนวน/ยอดขายต่อเมนู จากบิลที่ paid (ไม่นับ voided)
  async topMenus(shopId: number, dateStr?: string) {
    const date = dateStr ?? this.bangkokToday();
    const start = new Date(`${date}T00:00:00+07:00`);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)');
    }
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const items = await this.prisma.orderItem.findMany({
      where: {
        status: { not: 'voided' },
        bill: { shopId, status: 'paid', paidAt: { gte: start, lt: end } },
      },
      select: { itemName: true, quantity: true, unitPrice: true },
    });

    const map = new Map<
      string,
      { itemName: string; quantity: number; revenueSatang: number }
    >();
    for (const it of items) {
      const row = map.get(it.itemName) ?? {
        itemName: it.itemName,
        quantity: 0,
        revenueSatang: 0,
      };
      row.quantity += it.quantity;
      row.revenueSatang += it.unitPrice * it.quantity;
      map.set(it.itemName, row);
    }

    return {
      date,
      menus: [...map.values()]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10),
    };
  }

  // เวลาเตรียมอาหารเฉลี่ย — จากรายการที่เสิร์ฟแล้วในวันนั้น (servedAt - createdAt)
  // ช่วยให้เจ้าของร้านเห็นว่าเมนูไหนทำช้า/ครัวคอขวดช่วงไหน
  async prepTimes(shopId: number, dateStr?: string) {
    const date = dateStr ?? this.bangkokToday();
    const start = new Date(`${date}T00:00:00+07:00`);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)');
    }
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const items = await this.prisma.orderItem.findMany({
      where: {
        status: 'served',
        servedAt: { gte: start, lt: end },
        bill: { shopId },
      },
      select: { itemName: true, createdAt: true, servedAt: true },
    });

    const map = new Map<
      string,
      { itemName: string; totalSec: number; count: number }
    >();
    let grandTotal = 0;
    let grandCount = 0;
    for (const it of items) {
      if (!it.servedAt) continue;
      const sec = Math.max(
        0,
        Math.round((it.servedAt.getTime() - it.createdAt.getTime()) / 1000),
      );
      const row = map.get(it.itemName) ?? {
        itemName: it.itemName,
        totalSec: 0,
        count: 0,
      };
      row.totalSec += sec;
      row.count += 1;
      map.set(it.itemName, row);
      grandTotal += sec;
      grandCount += 1;
    }

    return {
      date,
      servedCount: grandCount,
      overallAvgSec: grandCount ? Math.round(grandTotal / grandCount) : 0,
      // เรียงเมนูที่ใช้เวลาเฉลี่ยนานสุดก่อน
      menus: [...map.values()]
        .map((r) => ({
          itemName: r.itemName,
          avgSec: Math.round(r.totalSec / r.count),
          count: r.count,
        }))
        .sort((a, b) => b.avgSec - a.avgSec),
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
      status: bill.status,
      refundReason: bill.refundReason,
      refundedAt: bill.refundedAt,
      refundedByName: bill.refundedByName,
      categories: [...groups.values()],
    };
  }

  // คืนเงินบิลที่ชำระแล้ว — ตั้งสถานะ refunded (หลุดจากยอดขาย), เก็บเหตุผล/ผู้ทำ
  // restoreStock = คืนสต็อกให้เมนู (กรณีคืนเพราะสั่งผิด); ปกติอาหารถูกกินแล้ว = ไม่คืน
  async refundBill(
    shopId: number,
    billId: number,
    staffName: string,
    reason: string,
    restoreStock: boolean,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findFirst({
        where: { id: billId, shopId },
        include: { orderItems: true },
      });
      if (!bill) throw new NotFoundException('ไม่พบบิล');
      if (bill.status !== 'paid') {
        throw new ConflictException('คืนเงินได้เฉพาะบิลที่ชำระแล้ว');
      }

      if (restoreStock) {
        for (const oi of bill.orderItems) {
          if (oi.status === 'voided') continue;
          // คืนเฉพาะเมนูที่นับสต็อก (stock_count ไม่ใช่ null)
          await tx.menu.updateMany({
            where: { id: oi.menuId, stockCount: { not: null } },
            data: { stockCount: { increment: oi.quantity } },
          });
        }
      }

      return tx.bill.update({
        where: { id: billId },
        data: {
          status: 'refunded',
          refundReason: reason.trim() || null,
          refundedAt: new Date(),
          refundedByName: staffName,
        },
      });
    });
  }

  // ข้อมูลบิลในรูปแบบเดียวกับตอน checkout — สำหรับพิมพ์ใบเสร็จซ้ำ
  async billReceipt(shopId: number, billId: number) {
    const bill = await this.prisma.bill.findFirst({
      where: { id: billId, shopId },
      include: {
        table: true,
        shop: true,
        orderItems: {
          where: { status: { not: 'voided' } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!bill) throw new NotFoundException('ไม่พบบิล');

    const subtotal = bill.orderItems.reduce(
      (sum, i) => sum + i.unitPrice * i.quantity,
      0,
    );
    const { table, shop, orderItems, ...rest } = bill;
    return {
      ...rest,
      subtotal,
      table: { id: table.id, tableNumber: table.tableNumber },
      shop: {
        name: shop.name,
        address: shop.address,
        phone: shop.phone,
        taxId: shop.taxId,
        promptpayId: shop.promptpayId,
      },
      orderItems,
      member: null,
    };
  }
}
