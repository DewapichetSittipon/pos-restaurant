// ตรรกะการเข้าถึงตาม subscription plan — pure functions (ทดสอบได้, ไม่แตะ DB)
// ดูเหตุผล/โมเดลที่ ../../../docs/adr/0009-subscription-plans.md
// service ฝั่ง DB (subscription.service.ts) โหลด plan แล้วเรียกฟังก์ชันเหล่านี้ตัดสินใจ

// feature key ที่แต่ละ plan ปลดล็อกได้ — ค่าเหล่านี้เก็บใน Plan.features (String[]) ใน DB
// เปลี่ยน "ค่า" string ไม่ได้ตามใจ เพราะผูกกับข้อมูลใน DB/seed
export const PLAN_FEATURES = {
  reportHistory: 'report_history', // รายงานย้อนหลัง + export (ไม่ใช่แค่วันนี้)
  promotions: 'promotions', // promotion engine
  loyalty: 'loyalty', // สมาชิก/สะสมแต้ม
  i18n: 'i18n', // เมนูหลายภาษา
  reservations: 'reservations', // จองโต๊ะ
  shifts: 'shifts', // กะ/cash drawer
  escposPrint: 'escpos_print', // พิมพ์ครัวตรง ESC/POS
  vat: 'vat', // VAT / ใบกำกับภาษี
} as const;

export type PlanFeature = (typeof PLAN_FEATURES)[keyof typeof PLAN_FEATURES];

// resource ที่นับเพดานต่อร้านได้ตาม plan
export type LimitedResource = 'staff' | 'table' | 'menu';

// ส่วนของ Plan ที่จำเป็นต่อการตัดสินสิทธิ์ (subset — รับมาจาก DB หรือ fallback ก็ได้)
// limit = null หมายถึง "ไม่จำกัด"
export interface PlanAccess {
  features: string[];
  maxStaff: number | null;
  maxTable: number | null;
  maxMenu: number | null;
}

// plan ฟรี default เมื่อ shop.planId = null และหา Plan key "free" ใน DB ไม่เจอ (safety net)
// ปกติควรอ่านจาก DB — ดู subscription.service.ts; ค่านี้กันระบบพังถ้า seed หาย
export const FREE_PLAN_FALLBACK: PlanAccess = {
  features: [],
  maxStaff: 3,
  maxTable: 10,
  maxMenu: 30,
};

export function planHasFeature(plan: PlanAccess, feature: PlanFeature): boolean {
  return plan.features.includes(feature);
}

export function limitForResource(
  plan: PlanAccess,
  resource: LimitedResource,
): number | null {
  switch (resource) {
    case 'staff':
      return plan.maxStaff;
    case 'table':
      return plan.maxTable;
    case 'menu':
      return plan.maxMenu;
  }
}

// ยังเพิ่ม resource ได้อีกไหม — currentCount = จำนวนที่มีอยู่ตอนนี้
// true = เพิ่มได้ (limit null = ไม่จำกัด, หรือ currentCount ยังไม่ถึงเพดาน)
export function canAddResource(
  plan: PlanAccess,
  resource: LimitedResource,
  currentCount: number,
): boolean {
  const limit = limitForResource(plan, resource);
  return limit === null || currentCount < limit;
}
