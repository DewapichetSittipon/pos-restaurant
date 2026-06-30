import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  canAddResource,
  FREE_PLAN_FALLBACK,
  planHasFeature,
  type LimitedResource,
  type PlanAccess,
  type PlanFeature,
} from '../common/plan-access';

// คีย์ของ plan ฟรี (ใช้เป็น default เมื่อ shop.planId = null)
const FREE_PLAN_KEY = 'free';

// resource → ข้อความ + วิธีนับจำนวนที่มีอยู่ของร้าน (scope shopId เสมอ)
const RESOURCE_LABEL: Record<LimitedResource, string> = {
  staff: 'พนักงาน',
  table: 'โต๊ะ',
  menu: 'เมนู',
};

// HTTP 402 Payment Required — ใช้สื่อว่า "ต้องอัปเกรด plan" (แยกจาก 403 สิทธิ์ปกติ)
function paymentRequired(message: string): HttpException {
  return new HttpException(
    { statusCode: HttpStatus.PAYMENT_REQUIRED, message, error: 'Payment Required' },
    HttpStatus.PAYMENT_REQUIRED,
  );
}

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  // plan ที่ผูกกับร้าน (เต็ม record) — null planId → plan ฟรีจาก DB; ถ้าไม่เจอเลยใช้ fallback
  async getShopPlan(shopId: number): Promise<Plan | null> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: { plan: true },
    });
    if (shop?.plan) {
      return shop.plan;
    }
    return this.prisma.plan.findUnique({ where: { key: FREE_PLAN_KEY } });
  }

  // subset ที่ใช้ตัดสินสิทธิ์ — แปลงจาก Plan record หรือใช้ fallback ฟรีถ้า DB ไม่มี plan เลย
  async getPlanAccess(shopId: number): Promise<PlanAccess> {
    const plan = await this.getShopPlan(shopId);
    if (!plan) {
      return FREE_PLAN_FALLBACK;
    }
    return {
      features: plan.features,
      maxStaff: plan.maxStaff,
      maxTable: plan.maxTable,
      maxMenu: plan.maxMenu,
    };
  }

  // โยน 402 ถ้า plan ของร้านไม่ปลดล็อกฟีเจอร์นี้
  async assertFeature(shopId: number, feature: PlanFeature): Promise<void> {
    const access = await this.getPlanAccess(shopId);
    if (!planHasFeature(access, feature)) {
      throw paymentRequired('ฟีเจอร์นี้ต้องอัปเกรดแพ็กเกจก่อนใช้งาน');
    }
  }

  // โยน 402 ถ้าเพิ่ม resource แล้วจะเกินเพดานของ plan (นับของที่มีอยู่ก่อน)
  async assertCanAdd(shopId: number, resource: LimitedResource): Promise<void> {
    const access = await this.getPlanAccess(shopId);
    const currentCount = await this.countResource(shopId, resource);
    if (!canAddResource(access, resource, currentCount)) {
      const limit =
        resource === 'staff'
          ? access.maxStaff
          : resource === 'table'
            ? access.maxTable
            : access.maxMenu;
      throw paymentRequired(
        `${RESOURCE_LABEL[resource]}ของแพ็กเกจปัจจุบันได้สูงสุด ${limit} รายการ — อัปเกรดเพื่อเพิ่ม`,
      );
    }
  }

  // สรุป subscription ของร้าน (สำหรับฝั่ง web ใช้ซ่อน/ล็อกฟีเจอร์ + โชว์โควต้าที่ใช้ไป)
  async getSummary(shopId: number) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        subscriptionStatus: true,
        currentPeriodEnd: true,
        trialEndsAt: true,
        plan: true,
      },
    });
    const plan = shop?.plan ?? (await this.getShopPlan(shopId));
    const [staff, table, menu] = await Promise.all([
      this.countResource(shopId, 'staff'),
      this.countResource(shopId, 'table'),
      this.countResource(shopId, 'menu'),
    ]);
    return {
      plan: plan && {
        key: plan.key,
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        features: plan.features,
        maxStaff: plan.maxStaff,
        maxTable: plan.maxTable,
        maxMenu: plan.maxMenu,
      },
      subscriptionStatus: shop?.subscriptionStatus ?? null,
      currentPeriodEnd: shop?.currentPeriodEnd ?? null,
      trialEndsAt: shop?.trialEndsAt ?? null,
      usage: { staff, table, menu },
    };
  }

  private countResource(
    shopId: number,
    resource: LimitedResource,
  ): Promise<number> {
    switch (resource) {
      case 'staff':
        return this.prisma.staff.count({ where: { shopId } });
      case 'table':
        return this.prisma.table.count({ where: { shopId } });
      case 'menu':
        // นับเฉพาะเมนูที่ยังไม่ archive (soft delete) — เมนูเก่าที่ archive แล้วไม่กินโควต้า
        return this.prisma.menu.count({
          where: { shopId, isArchived: false },
        });
    }
  }
}
