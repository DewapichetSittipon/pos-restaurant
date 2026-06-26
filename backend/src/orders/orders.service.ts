import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { OrderItem } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { SocketEvent } from '../events/socket.constants';
import type { OrderLineDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  // ลูกค้าสั่งอาหาร: หักสต็อกแบบ atomic (ADR-0001) + snapshot ราคา/ชื่อ + batch_id เดียวกัน
  // shopId มาจาก bill (resolve ผ่าน qr_token) — กันสั่งเมนูข้ามร้าน
  async create(shopId: number, billId: number, items: OrderLineDto[]) {
    const batchId = randomUUID();

    const created = await this.prisma.$transaction(async (tx) => {
      const result: OrderItem[] = [];
      for (const line of items) {
        const menu = await tx.menu.findFirst({
          where: { id: line.menuId, shopId },
        });
        if (!menu || menu.isArchived) {
          throw new NotFoundException(`ไม่พบเมนู (id ${line.menuId})`);
        }
        if (!menu.isAvailable) {
          throw new BadRequestException(`"${menu.name}" งดขายอยู่`);
        }

        // หักสต็อกเฉพาะเมนูที่นับสต็อก (stockCount != null) แบบ conditional update
        if (menu.stockCount !== null) {
          const dec = await tx.menu.updateMany({
            where: { id: menu.id, stockCount: { gte: line.quantity } },
            data: { stockCount: { decrement: line.quantity } },
          });
          if (dec.count === 0) {
            throw new ConflictException(`"${menu.name}" ของไม่พอ/หมดแล้ว`);
          }
        }

        const item = await tx.orderItem.create({
          data: {
            billId,
            menuId: menu.id,
            batchId,
            quantity: line.quantity,
            unitPrice: menu.price, // สตางค์ snapshot
            itemName: menu.name, // snapshot ชื่อ
            note: line.note?.trim() || null, // หมายเหตุต่อรายการ
            imageUrl: menu.imageUrl, // snapshot รูป
          },
        });
        result.push(item);
      }
      return result;
    });

    const payload = { billId, batchId, items: created };
    // staff ของร้านเห็นออเดอร์ใหม่ และอุปกรณ์อื่นที่โต๊ะเดียวกันเห็น history อัปเดต
    this.events.emitToShop(shopId, SocketEvent.OrderCreated, payload);
    this.events.emitToTable(billId, SocketEvent.OrderCreated, payload);
    return payload;
  }

  // พนักงานคีย์ออเดอร์ให้โต๊ะ (walk-in / สั่งปากเปล่า) — resolve บิลที่เปิดอยู่ของโต๊ะ
  // แล้ว reuse logic เดียวกับฝั่งลูกค้า (หักสต็อก + snapshot + push)
  async createByStaff(shopId: number, tableId: number, items: OrderLineDto[]) {
    const bill = await this.prisma.bill.findFirst({
      where: { tableId, shopId, status: 'pending' },
      select: { id: true },
    });
    if (!bill) {
      throw new NotFoundException(
        'โต๊ะนี้ยังไม่ได้เปิด กรุณาเปิดโต๊ะก่อนเพิ่มรายการ',
      );
    }
    return this.create(shopId, bill.id, items);
  }

  // คิวครัว: รายการของบิลที่ยังเปิดอยู่ของร้านนี้ (ยกเว้น voided) เรียงตามเวลา
  // รวม served ไว้เพื่อโชว์เวลาเสิร์ฟจนกว่าจะเช็คบิล
  activeQueue(shopId: number) {
    return this.prisma.orderItem.findMany({
      where: {
        status: { in: ['queued', 'cooking', 'served'] },
        bill: { status: 'pending', shopId },
      },
      orderBy: { createdAt: 'asc' },
      include: { bill: { include: { table: true } } },
    });
  }

  // ครัวเปลี่ยนสถานะอาหาร -> push ให้ลูกค้า + staff ของร้าน (verify ว่ารายการเป็นของร้านนี้)
  async updateStatus(shopId: number, id: number, status: 'cooking' | 'served') {
    const item = await this.prisma.orderItem.findFirst({
      where: { id, bill: { shopId } },
    });
    if (!item) {
      throw new NotFoundException('ไม่พบรายการอาหาร');
    }
    if (item.status === 'voided') {
      throw new BadRequestException('รายการนี้ถูกยกเลิกแล้ว');
    }

    const updated = await this.prisma.orderItem.update({
      where: { id },
      data: { status, servedAt: status === 'served' ? new Date() : item.servedAt },
    });

    this.events.emitToTable(item.billId, SocketEvent.OrderItemStatusChanged, updated);
    this.events.emitToShop(shopId, SocketEvent.OrderItemStatusChanged, updated);
    return updated;
  }

  // Void (ADR-0002): ยกเลิกรายการได้ทุกสถานะ (ยกเว้นที่ยกเลิกไปแล้ว) พร้อมเหตุผล
  // คืนสต็อกเฉพาะรายการที่ยัง queued (ของที่เริ่มทำแล้ว = ต้นทุนเสีย ไม่คืน)
  async voidItem(shopId: number, id: number, reason?: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findFirst({
        where: { id, bill: { shopId } },
      });
      if (!item) {
        throw new NotFoundException('ไม่พบรายการอาหาร');
      }
      if (item.status === 'voided') {
        throw new ConflictException('รายการนี้ถูกยกเลิกไปแล้ว');
      }

      // คืนสต็อกเฉพาะตอนยังไม่เริ่มทำ
      if (item.status === 'queued') {
        const menu = await tx.menu.findUnique({ where: { id: item.menuId } });
        if (menu && menu.stockCount !== null) {
          await tx.menu.update({
            where: { id: menu.id },
            data: { stockCount: { increment: item.quantity } },
          });
        }
      }

      return tx.orderItem.update({
        where: { id },
        data: { status: 'voided', voidReason: reason?.trim() || null },
      });
    });

    this.events.emitToTable(updated.billId, SocketEvent.OrderItemStatusChanged, updated);
    this.events.emitToShop(shopId, SocketEvent.OrderItemStatusChanged, updated);
    return updated;
  }
}
