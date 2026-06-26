import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, type Bill, type Table } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { SocketEvent } from '../events/socket.constants';
import { computeBillTotals } from '../common/bill-math';

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  // เพิ่มโต๊ะใหม่ในร้าน (table_number unique ต่อร้าน)
  async createTable(shopId: number, tableNumber: string) {
    try {
      return await this.prisma.table.create({
        data: { shopId, tableNumber: tableNumber.trim() },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(`มีโต๊ะหมายเลข ${tableNumber} อยู่แล้ว`);
      }
      throw err;
    }
  }

  // ลบโต๊ะ — ห้ามลบถ้าเคยมีบิล (รักษาประวัติ) หรือกำลังมีลูกค้า
  async deleteTable(shopId: number, tableId: number) {
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, shopId },
      include: { _count: { select: { bills: true } } },
    });
    if (!table) {
      throw new NotFoundException('ไม่พบโต๊ะ');
    }
    if (table._count.bills > 0) {
      throw new ConflictException(
        'ลบไม่ได้: โต๊ะนี้มีประวัติบิลแล้ว (ลบได้เฉพาะโต๊ะที่ยังไม่เคยใช้)',
      );
    }
    await this.prisma.table.delete({ where: { id: tableId } });
    return { ok: true };
  }

  async listTables(shopId: number) {
    const tables = await this.prisma.table.findMany({
      where: { shopId },
      orderBy: { id: 'asc' },
      include: {
        bills: {
          where: { status: 'pending' },
          include: {
            serviceRequests: { where: { status: 'pending' } },
            orderItems: {
              where: { status: { not: 'voided' } },
              select: { unitPrice: true, quantity: true },
            },
          },
        },
      },
    });

    // totalPrice ใน DB เป็น null จนกว่าจะ checkout → คำนวณยอดสดจากรายการที่ยังไม่ถูกยกเลิก
    return tables.map((table) => ({
      ...table,
      bills: table.bills.map(({ orderItems, ...bill }) => ({
        ...bill,
        totalPrice: orderItems.reduce(
          (sum, i) => sum + i.unitPrice * i.quantity,
          0,
        ),
      })),
    }));
  }

  // ย้ายบิลที่เปิดอยู่ไปโต๊ะอื่น (ที่ว่าง) — เช่น ลูกค้าเปลี่ยนโต๊ะ
  async transferBill(shopId: number, fromTableId: number, toTableId: number) {
    if (fromTableId === toTableId) {
      throw new ConflictException('เป็นโต๊ะเดียวกัน');
    }
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findFirst({
        where: { tableId: fromTableId, shopId, status: 'pending' },
      });
      if (!bill) {
        throw new NotFoundException('ไม่พบบิลที่เปิดอยู่ของโต๊ะต้นทาง');
      }
      const toTable = await tx.table.findFirst({
        where: { id: toTableId, shopId },
      });
      if (!toTable) {
        throw new NotFoundException('ไม่พบโต๊ะปลายทาง');
      }
      const occupied = await tx.bill.findFirst({
        where: { tableId: toTableId, status: 'pending' },
      });
      if (occupied) {
        throw new ConflictException('โต๊ะปลายทางมีลูกค้าอยู่แล้ว');
      }

      await tx.bill.update({
        where: { id: bill.id },
        data: { tableId: toTableId },
      });
      await tx.table.update({
        where: { id: fromTableId },
        data: { status: 'vacant' },
      });
      await tx.table.update({
        where: { id: toTableId },
        data: { status: 'occupied' },
      });

      // ให้ทุกอุปกรณ์ในร้านรีโหลดผัง (reuse event ที่ grid ฟังอยู่แล้ว)
      this.events.emitToShop(shopId, SocketEvent.TableOpened, {
        tableId: toTableId,
        billId: bill.id,
      });
      return { ok: true };
    });
  }

  // รวมบิล: ย้ายรายการ/คำขอจากบิลโต๊ะต้นทาง มารวมที่บิลโต๊ะปลายทาง (:toTableId)
  // ใช้เคสลูกค้ากลุ่มเดียวนั่งหลายโต๊ะแล้วจ่ายรวม — ทั้งสองโต๊ะต้องมีบิลเปิดอยู่
  async mergeBills(shopId: number, toTableId: number, fromTableId: number) {
    if (fromTableId === toTableId) {
      throw new ConflictException('เป็นโต๊ะเดียวกัน');
    }
    return this.prisma.$transaction(async (tx) => {
      const toBill = await tx.bill.findFirst({
        where: { tableId: toTableId, shopId, status: 'pending' },
      });
      if (!toBill) {
        throw new NotFoundException('ไม่พบบิลที่เปิดอยู่ของโต๊ะปลายทาง');
      }
      const fromBill = await tx.bill.findFirst({
        where: { tableId: fromTableId, shopId, status: 'pending' },
      });
      if (!fromBill) {
        throw new NotFoundException('ไม่พบบิลที่เปิดอยู่ของโต๊ะต้นทาง');
      }

      // ย้ายรายการอาหาร + คำขอบริการ ไปอยู่ใต้บิลปลายทาง
      await tx.orderItem.updateMany({
        where: { billId: fromBill.id },
        data: { billId: toBill.id },
      });
      await tx.serviceRequest.updateMany({
        where: { billId: fromBill.id },
        data: { billId: toBill.id },
      });

      // ปิดบิลต้นทาง (ว่างเปล่าแล้ว) + โต๊ะต้นทางกลับเป็นว่าง
      await tx.bill.delete({ where: { id: fromBill.id } });
      await tx.table.update({
        where: { id: fromTableId },
        data: { status: 'vacant' },
      });

      // แจ้งจอลูกค้าโต๊ะต้นทางว่าบิลปิดแล้ว + ให้ทุกอุปกรณ์ในร้านรีโหลดผัง
      this.events.emitToTable(fromBill.id, SocketEvent.BillClosed, {
        billId: fromBill.id,
      });
      this.events.emitToShop(shopId, SocketEvent.TableOpened, {
        tableId: toTableId,
        billId: toBill.id,
      });
      return { ok: true };
    });
  }

  // แยกบิล: ย้ายรายการที่เลือกจากบิลโต๊ะต้นทาง ไปเปิดเป็นบิลใหม่ที่โต๊ะว่างปลายทาง
  // ใช้เคสลูกค้ากลุ่มเดียวกันขอแยกจ่าย — ต้องเหลืออย่างน้อย 1 รายการที่ต้นทาง (ถ้าย้ายหมด = ใช้ย้ายโต๊ะ)
  async splitBill(
    shopId: number,
    fromTableId: number,
    toTableId: number,
    orderItemIds: number[],
  ) {
    if (fromTableId === toTableId) {
      throw new ConflictException('เป็นโต๊ะเดียวกัน');
    }
    return this.prisma.$transaction(async (tx) => {
      const fromBill = await tx.bill.findFirst({
        where: { tableId: fromTableId, shopId, status: 'pending' },
        include: { orderItems: { where: { status: { not: 'voided' } } } },
      });
      if (!fromBill) {
        throw new NotFoundException('ไม่พบบิลที่เปิดอยู่ของโต๊ะต้นทาง');
      }
      const toTable = await tx.table.findFirst({
        where: { id: toTableId, shopId },
      });
      if (!toTable) {
        throw new NotFoundException('ไม่พบโต๊ะปลายทาง');
      }
      const occupied = await tx.bill.findFirst({
        where: { tableId: toTableId, status: 'pending' },
      });
      if (occupied) {
        throw new ConflictException('โต๊ะปลายทางมีลูกค้าอยู่แล้ว');
      }

      // เลือกเฉพาะ id ที่อยู่ในบิลต้นทางจริงและยังไม่ถูกยกเลิก
      const validIds = new Set(fromBill.orderItems.map((i) => i.id));
      const selected = [...new Set(orderItemIds)].filter((id) =>
        validIds.has(id),
      );
      if (selected.length === 0) {
        throw new ConflictException('รายการที่เลือกไม่ถูกต้อง');
      }
      if (selected.length === fromBill.orderItems.length) {
        throw new ConflictException('แยกทั้งหมดไม่ได้ — ใช้ย้ายโต๊ะแทน');
      }

      const qrToken = randomUUID();
      const newBill = await tx.bill.create({
        data: { shopId, tableId: toTableId, qrToken, status: 'pending' },
      });
      await tx.orderItem.updateMany({
        where: { id: { in: selected }, billId: fromBill.id },
        data: { billId: newBill.id },
      });
      await tx.table.update({
        where: { id: toTableId },
        data: { status: 'occupied' },
      });

      // ให้ทุกอุปกรณ์ในร้านรีโหลดผัง (ทั้งโต๊ะต้นทาง/ปลายทางอัปเดต)
      this.events.emitToShop(shopId, SocketEvent.TableOpened, {
        tableId: toTableId,
        billId: newBill.id,
      });
      return { ok: true, newBillId: newBill.id };
    });
  }

  // รายการของบิลที่เปิดอยู่ของโต๊ะ (ฝั่งพนักงาน) — scope ด้วย shopId, รวมสถานะแต่ละรายการ
  async getCurrentBill(shopId: number, tableId: number) {
    const bill = await this.prisma.bill.findFirst({
      where: { tableId, shopId, status: 'pending' },
      include: {
        table: true,
        orderItems: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!bill) {
      throw new NotFoundException('โต๊ะนี้ยังไม่มีบิลที่เปิดอยู่');
    }
    // ยอดรวมสด (ไม่นับรายการที่ยกเลิก)
    const totalPrice = bill.orderItems
      .filter((i) => i.status !== 'voided')
      .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    return { ...bill, totalPrice };
  }

  // เปิดโต๊ะ: สร้าง Bill ใหม่ + qr_token — 409 ถ้ามี Bill pending อยู่แล้ว
  // verify ว่าโต๊ะเป็นของร้านนี้ก่อนเสมอ
  async openTable(
    shopId: number,
    tableId: number,
  ): Promise<Bill & { table: Table; customerUrl: string }> {
    return this.prisma.$transaction(async (tx) => {
      const table = await tx.table.findFirst({ where: { id: tableId, shopId } });
      if (!table) {
        throw new NotFoundException('ไม่พบโต๊ะ');
      }
      const existing = await tx.bill.findFirst({
        where: { tableId, status: 'pending' },
      });
      if (existing) {
        throw new ConflictException('โต๊ะนี้มีบิลที่เปิดอยู่แล้ว');
      }

      // อัปเดตสถานะโต๊ะก่อน เพื่อให้ bill.table ที่ include กลับมาเป็น occupied
      await tx.table.update({
        where: { id: tableId },
        data: { status: 'occupied' },
      });
      const qrToken = randomUUID();
      const bill = await tx.bill.create({
        data: { shopId, tableId, qrToken, status: 'pending' },
        include: { table: true },
      });

      const base = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
      const customerUrl = `${base}/table/${tableId}?token=${qrToken}`;

      this.events.emitToShop(shopId, SocketEvent.TableOpened, {
        tableId,
        billId: bill.id,
      });
      return { ...bill, customerUrl };
    });
  }

  // เช็คบิล: snapshot total_price (สุทธิหลังส่วนลด) + วิธีชำระ, set paid, โต๊ะกลับเป็น vacant
  async checkout(
    shopId: number,
    tableId: number,
    opts: {
      discount?: number;
      paymentMethod: 'cash' | 'transfer';
      receivedAmount?: number;
      memberId?: number;
      redeemPoints?: number;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findFirst({
        where: { tableId, shopId, status: 'pending' },
        include: {
          orderItems: { orderBy: { createdAt: 'asc' } },
          table: true,
          shop: true,
        },
      });
      if (!bill) {
        throw new NotFoundException('ไม่พบบิลที่เปิดอยู่ของโต๊ะนี้');
      }

      // เฉพาะรายการที่ไม่ถูกยกเลิก — ใช้ทั้งคิดเงินและพิมพ์ใบเสร็จ
      const billedItems = bill.orderItems.filter((i) => i.status !== 'voided');
      const subtotal = billedItems.reduce(
        (sum, i) => sum + i.unitPrice * i.quantity,
        0,
      );

      // สมาชิก: แลกแต้มเป็นส่วนลด (1 แต้ม = 1 บาท) ก่อนคิดภาษี
      let member: { id: number; points: number } | null = null;
      if (opts.memberId != null) {
        const m = await tx.member.findFirst({
          where: { id: opts.memberId, shopId },
          select: { id: true, points: true },
        });
        if (!m) throw new NotFoundException('ไม่พบสมาชิก');
        member = m;
      }

      const manualDiscount = Math.min(
        Math.max(opts.discount ?? 0, 0),
        subtotal,
      );
      // แลกแต้มได้ไม่เกิน: แต้มคงเหลือ และ ยอดที่เหลือหลังหักส่วนลดปกติ
      const maxRedeemByBill = Math.floor((subtotal - manualDiscount) / 100);
      const redeemPoints = member
        ? Math.min(
            Math.max(opts.redeemPoints ?? 0, 0),
            member.points,
            maxRedeemByBill,
          )
        : 0;
      const redeemSatang = redeemPoints * 100;

      // คิดเซอร์วิสชาร์จ/VAT ตามตั้งค่าร้าน (snapshot อัตราลงบิลกันยอดเพี้ยนภายหลัง)
      const charges = {
        vatRate: bill.shop.vatRate,
        vatInclusive: bill.shop.vatInclusive,
        serviceChargeRate: bill.shop.serviceChargeRate,
      };
      const totals = computeBillTotals(
        subtotal,
        manualDiscount + redeemSatang,
        charges,
      );
      const { serviceCharge, vatAmount, total } = totals;
      // เก็บส่วนลดปกติแยกจากแต้มที่แลก (ใบเสร็จโชว์คนละบรรทัด)
      const discount = manualDiscount;

      // ได้แต้มจากยอดสุทธิ: earnRate แต้มต่อ 100 บาท (เฉพาะมีสมาชิก + เปิดระบบ)
      const earnRate = bill.shop.loyaltyEarnRate;
      const pointsEarned =
        member && earnRate > 0
          ? Math.floor(total / 10000) * earnRate
          : 0;

      // ผูกบิลกับกะที่เปิดอยู่ (ถ้ามี) เพื่อกระทบยอดเงินสดตอนปิดกะ
      const openShift = await tx.shift.findFirst({
        where: { shopId, status: 'open' },
        select: { id: true },
      });

      const paid = await tx.bill.update({
        where: { id: bill.id },
        data: {
          status: 'paid',
          paidAt: new Date(),
          totalPrice: total,
          discount,
          serviceCharge,
          serviceChargeRate: charges.serviceChargeRate,
          vatAmount,
          vatRate: charges.vatRate,
          vatInclusive: charges.vatInclusive,
          paymentMethod: opts.paymentMethod,
          receivedAmount: opts.receivedAmount ?? null,
          shiftId: openShift?.id ?? null,
          memberId: member?.id ?? null,
          pointsRedeemed: redeemPoints,
          pointsEarned,
        },
      });
      await tx.table.update({
        where: { id: tableId },
        data: { status: 'vacant' },
      });

      // อัปเดตแต้มสมาชิก (หักที่แลก + บวกที่ได้)
      let memberAfter: { name: string | null; points: number } | null = null;
      if (member) {
        const updated = await tx.member.update({
          where: { id: member.id },
          data: { points: member.points - redeemPoints + pointsEarned },
          select: { name: true, points: true },
        });
        memberAfter = updated;
      }

      this.events.emitToTable(bill.id, SocketEvent.BillClosed, {
        billId: bill.id,
        totalPrice: total,
      });
      this.events.emitToShop(shopId, SocketEvent.BillClosed, {
        billId: bill.id,
        tableId,
        totalPrice: total,
      });

      // ส่งข้อมูลครบสำหรับพิมพ์ใบเสร็จ (รายการ + โต๊ะ + หัวร้าน + ยอดก่อนหักส่วนลด)
      return {
        ...paid,
        subtotal,
        table: { id: bill.table.id, tableNumber: bill.table.tableNumber },
        shop: {
          name: bill.shop.name,
          address: bill.shop.address,
          phone: bill.shop.phone,
          taxId: bill.shop.taxId,
          promptpayId: bill.shop.promptpayId,
        },
        orderItems: billedItems,
        member: memberAfter
          ? {
              name: memberAfter.name,
              pointsBalance: memberAfter.points,
              pointsEarned,
              pointsRedeemed: redeemPoints,
            }
          : null,
      };
    });
  }

  // มุมมองลูกค้า: บิลปัจจุบัน + รายการที่สั่ง (group ด้วย batchId ฝั่ง frontend)
  async getSession(billId: number) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
      include: {
        table: true,
        orderItems: { orderBy: { createdAt: 'asc' } },
        serviceRequests: { where: { status: 'pending' } },
      },
    });
    if (!bill) {
      throw new NotFoundException('ไม่พบบิล');
    }
    return bill;
  }
}
