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

  // เช็คบิล: snapshot total_price, set paid + paid_at, โต๊ะกลับเป็น vacant
  async checkout(shopId: number, tableId: number) {
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
      const total = billedItems.reduce(
        (sum, i) => sum + i.unitPrice * i.quantity,
        0,
      );

      const paid = await tx.bill.update({
        where: { id: bill.id },
        data: { status: 'paid', paidAt: new Date(), totalPrice: total },
      });
      await tx.table.update({
        where: { id: tableId },
        data: { status: 'vacant' },
      });

      this.events.emitToTable(bill.id, SocketEvent.BillClosed, {
        billId: bill.id,
        totalPrice: total,
      });
      this.events.emitToShop(shopId, SocketEvent.BillClosed, {
        billId: bill.id,
        tableId,
        totalPrice: total,
      });

      // ส่งข้อมูลครบสำหรับพิมพ์ใบเสร็จ (รายการ + โต๊ะ + หัวร้าน)
      return {
        ...paid,
        table: { id: bill.table.id, tableNumber: bill.table.tableNumber },
        shop: {
          name: bill.shop.name,
          address: bill.shop.address,
          phone: bill.shop.phone,
          taxId: bill.shop.taxId,
        },
        orderItems: billedItems,
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
