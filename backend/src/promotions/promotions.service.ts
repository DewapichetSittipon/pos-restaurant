import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  evaluatePromotion,
  isBirthdayToday,
  type PromotionContext,
} from '../common/promotion-math';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { SubscriptionService } from '../subscription/subscription.service';
import { PLAN_FEATURES } from '../common/plan-access';

// แปลงรายการที่สั่ง → ราคาต่อหน่วยกระจายตาม quantity (สำหรับคิด BOGO)
function explodeUnitPrices(
  items: { unitPrice: number; quantity: number }[],
): number[] {
  const prices: number[] = [];
  for (const it of items) {
    for (let i = 0; i < it.quantity; i++) prices.push(it.unitPrice);
  }
  return prices;
}

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscription: SubscriptionService,
  ) {}

  list(shopId: number) {
    return this.prisma.promotion.findMany({
      where: { shopId },
      orderBy: [{ isActive: 'desc' }, { priority: 'desc' }, { id: 'desc' }],
    });
  }

  async create(shopId: number, dto: CreatePromotionDto) {
    // promotion engine = ฟีเจอร์ของแพ็กเกจโปรขึ้นไป
    await this.subscription.assertFeature(shopId, PLAN_FEATURES.promotions);
    return this.prisma.promotion.create({
      data: {
        shopId,
        name: dto.name.trim(),
        type: dto.type,
        ...this.optionalFields(dto),
      },
    });
  }

  async update(shopId: number, id: number, dto: UpdatePromotionDto) {
    await this.ensureOwned(shopId, id);
    return this.prisma.promotion.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        type: dto.type,
        ...this.optionalFields(dto),
      },
    });
  }

  async remove(shopId: number, id: number) {
    await this.ensureOwned(shopId, id);
    // โปรเคยถูกใช้บนบิล → FK ตั้ง onDelete: SetNull ไว้แล้ว (บิลเก่ายังมี snapshot ชื่อ/ยอด)
    await this.prisma.promotion.delete({ where: { id } });
    return { ok: true };
  }

  // โปรที่ใช้ได้กับบิลตอนนี้ (+ สมาชิกที่เลือก) พร้อมส่วนลดที่คำนวณแล้ว — สำหรับหน้าเช็คบิล
  async applicable(shopId: number, billId: number, memberId?: number) {
    const bill = await this.prisma.bill.findFirst({
      where: { id: billId, shopId, status: 'pending' },
      include: {
        orderItems: {
          where: { status: { not: 'voided' } },
          select: { unitPrice: true, quantity: true },
        },
      },
    });
    if (!bill) throw new NotFoundException('ไม่พบบิลที่เปิดอยู่');

    const member =
      memberId != null
        ? await this.prisma.member.findFirst({
            where: { id: memberId, shopId },
            select: { birthDate: true },
          })
        : null;

    const promos = await this.prisma.promotion.findMany({
      where: { shopId, isActive: true },
      orderBy: [{ priority: 'desc' }, { id: 'desc' }],
    });
    const ctx = this.buildContext(bill.orderItems, member, new Date());

    return promos
      .map((p) => ({ promotion: p, discount: evaluatePromotion(p, ctx) }))
      .filter((r) => r.discount > 0)
      .sort((a, b) => b.discount - a.discount);
  }

  // ใช้ตอน checkout: โหลดโปรในทรานแซกชัน + ตรวจเงื่อนไข + คืนส่วนลด (สตางค์)
  // โยน NotFound ถ้าโปรไม่ใช่ของร้าน; คืน 0 + ชื่อ ถ้าโปรใช้ไม่ได้แล้ว (กันยอดเพี้ยน — ไม่ลดมั่ว)
  async resolveForCheckout(
    tx: Prisma.TransactionClient,
    shopId: number,
    promotionId: number,
    items: { unitPrice: number; quantity: number }[],
    member: { birthDate: Date | null } | null,
    now: Date,
  ): Promise<{ name: string; discount: number }> {
    const promo = await tx.promotion.findFirst({
      where: { id: promotionId, shopId },
    });
    if (!promo) throw new NotFoundException('ไม่พบโปรโมชัน');
    const ctx = this.buildContext(items, member, now);
    return { name: promo.name, discount: evaluatePromotion(promo, ctx) };
  }

  private buildContext(
    items: { unitPrice: number; quantity: number }[],
    member: { birthDate: Date | null } | null,
    now: Date,
  ): PromotionContext {
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    return {
      subtotal,
      unitPrices: explodeUnitPrices(items),
      hasMember: member != null,
      isMemberBirthday: isBirthdayToday(member?.birthDate ?? null, now),
      now,
    };
  }

  private async ensureOwned(shopId: number, id: number) {
    const found = await this.prisma.promotion.findFirst({
      where: { id, shopId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('ไม่พบโปรโมชัน');
  }

  // ฟิลด์ที่ optional ทั้ง create/update (Prisma ใช้ default ตอน create, ข้าม undefined ตอน update)
  private optionalFields(dto: CreatePromotionDto | UpdatePromotionDto) {
    return {
      value: dto.value,
      minSubtotal: dto.minSubtotal,
      maxDiscount: dto.maxDiscount,
      startMinute: dto.startMinute,
      endMinute: dto.endMinute,
      daysOfWeek: dto.daysOfWeek,
      buyQty: dto.buyQty,
      getQty: dto.getQty,
      membersOnly: dto.membersOnly,
      birthdayOnly: dto.birthdayOnly,
      isActive: dto.isActive,
      priority: dto.priority,
    };
  }
}
