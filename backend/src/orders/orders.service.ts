import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
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
          include: {
            modifierGroups: { include: { options: true } },
            comboComponents: {
              orderBy: { sortOrder: 'asc' },
              include: { menu: true },
            },
          },
        });
        if (!menu || menu.isArchived) {
          throw new NotFoundException(`ไม่พบเมนู (id ${line.menuId})`);
        }
        if (!menu.isAvailable) {
          throw new BadRequestException(`"${menu.name}" งดขายอยู่`);
        }

        // ชุด/คอมโบ: ราคาคงที่ทั้งเซต, แตกเป็นส่วนประกอบให้ครัว, ตัดสต็อกตามส่วนประกอบ
        if (menu.isCombo) {
          const item = await this.createComboItem(tx, billId, batchId, menu, line);
          result.push(item);
          continue;
        }

        // ตรวจตัวเลือก (modifiers): ต้องเป็นของเมนูนี้ + พร้อมขาย + ตรงกฎ min/max ต่อกลุ่ม
        // priceDelta รวมแล้วบวกเข้า unitPrice เพื่อให้สูตรคิดเงิน/รายงานที่ใช้ unitPrice*qty ถูกต้องโดยไม่ต้องแก้
        const selectedIds = [...new Set(line.modifierOptionIds ?? [])];
        const optionsById = new Map(
          menu.modifierGroups.flatMap((g) =>
            g.options.map((o) => [o.id, o] as const),
          ),
        );
        const chosen = selectedIds.map((id) => {
          const opt = optionsById.get(id);
          if (!opt) {
            throw new BadRequestException(
              `ตัวเลือกไม่ถูกต้องสำหรับ "${menu.name}"`,
            );
          }
          if (!opt.isAvailable) {
            throw new BadRequestException(`"${opt.name}" หมด/งดขายอยู่`);
          }
          return opt;
        });
        for (const g of menu.modifierGroups) {
          const count = chosen.filter((o) => o.groupId === g.id).length;
          if (count < g.minSelect) {
            throw new BadRequestException(
              `"${menu.name}" ต้องเลือก "${g.name}" อย่างน้อย ${g.minSelect} อย่าง`,
            );
          }
          if (count > g.maxSelect) {
            throw new BadRequestException(
              `"${menu.name}" เลือก "${g.name}" ได้ไม่เกิน ${g.maxSelect} อย่าง`,
            );
          }
        }
        const modifierDelta = chosen.reduce((s, o) => s + o.priceDelta, 0);

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
            unitPrice: menu.price + modifierDelta, // สตางค์ snapshot (รวมตัวเลือก)
            itemName: menu.name, // snapshot ชื่อ
            note: line.note?.trim() || null, // หมายเหตุต่อรายการ
            imageUrl: menu.imageUrl, // snapshot รูป
            // snapshot ตัวเลือกที่เลือก เพื่อโชว์บนใบเสร็จ/คิวครัว
            modifiers: {
              create: chosen.map((o) => ({
                optionId: o.id,
                name: o.name,
                priceDelta: o.priceDelta,
              })),
            },
          },
          include: { modifiers: true },
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

  // สร้าง OrderItem ของชุด/คอมโบ: ราคาคงที่ (menu.price) + snapshot ส่วนประกอบให้ครัว
  // ตัดสต็อกของส่วนประกอบที่นับสต็อก (qty ในเซต × จำนวนชุดที่สั่ง) แบบ conditional update
  private async createComboItem(
    tx: Prisma.TransactionClient,
    billId: number,
    batchId: string,
    menu: Prisma.MenuGetPayload<{
      include: { comboComponents: { include: { menu: true } } };
    }>,
    line: OrderLineDto,
  ): Promise<OrderItem> {
    if (line.modifierOptionIds && line.modifierOptionIds.length > 0) {
      throw new BadRequestException(`"${menu.name}" เป็นชุด เลือกตัวเลือกเพิ่มไม่ได้`);
    }
    if (menu.comboComponents.length === 0) {
      throw new BadRequestException(`"${menu.name}" ยังไม่ได้กำหนดรายการในชุด`);
    }

    for (const comp of menu.comboComponents) {
      if (comp.menu.isArchived || !comp.menu.isAvailable) {
        throw new BadRequestException(`"${comp.menu.name}" ในชุดงดขายอยู่`);
      }
      // หักสต็อกเฉพาะส่วนประกอบที่นับสต็อก: ต้องพอสำหรับ (qty ในเซต × จำนวนชุด)
      if (comp.menu.stockCount !== null) {
        const needed = comp.quantity * line.quantity;
        const dec = await tx.menu.updateMany({
          where: { id: comp.menuId, stockCount: { gte: needed } },
          data: { stockCount: { decrement: needed } },
        });
        if (dec.count === 0) {
          throw new ConflictException(`"${comp.menu.name}" ของไม่พอ/หมดแล้ว`);
        }
      }
    }

    return tx.orderItem.create({
      data: {
        billId,
        menuId: menu.id,
        batchId,
        quantity: line.quantity,
        unitPrice: menu.price, // สตางค์ — ราคาคงที่ของทั้งเซต
        itemName: menu.name,
        note: line.note?.trim() || null,
        imageUrl: menu.imageUrl,
        // snapshot ส่วนประกอบ (qty ต่อหนึ่งชุด) ไว้โชว์ครัว/ใบเสร็จ
        comboItems: {
          create: menu.comboComponents.map((c) => ({
            menuId: c.menuId,
            name: c.menu.name,
            quantity: c.quantity,
          })),
        },
      },
      include: { modifiers: true, comboItems: true },
    });
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

  // พนักงานเพิ่มรายการเข้าบิลกลับบ้าน/เดลิเวอรี (resolve ด้วย billId แทนโต๊ะ)
  async createForBill(shopId: number, billId: number, items: OrderLineDto[]) {
    const bill = await this.prisma.bill.findFirst({
      where: { id: billId, shopId, status: 'pending' },
      select: { id: true },
    });
    if (!bill) {
      throw new NotFoundException('ไม่พบบิลที่เปิดอยู่');
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
      include: {
        bill: { include: { table: true } },
        modifiers: true,
        comboItems: true,
      },
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
        if (menu?.isCombo) {
          // combo ตัดสต็อกที่ส่วนประกอบ — คืนตาม snapshot (qty ในเซต × จำนวนชุด)
          const comps = await tx.orderItemComboComponent.findMany({
            where: { orderItemId: item.id },
          });
          for (const c of comps) {
            if (c.menuId === null) continue;
            const comp = await tx.menu.findUnique({ where: { id: c.menuId } });
            if (comp && comp.stockCount !== null) {
              await tx.menu.update({
                where: { id: comp.id },
                data: { stockCount: { increment: c.quantity * item.quantity } },
              });
            }
          }
        } else if (menu && menu.stockCount !== null) {
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
