// ผู้ดูแลแพลตฟอร์ม (เจ้าของระบบ SaaS) — แยกจาก Staff ของร้าน
export interface PlatformAdmin {
  id: number;
  username: string;
}

export type ShopStatus = 'pending' | 'active';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled';

// แพ็กเกจการใช้งาน (subscription plan) — ตรงกับ model Plan ฝั่ง backend
export interface Plan {
  id: number;
  key: string; // free | pro | business
  name: string;
  priceMonthly: number; // สตางค์/เดือน
  features: string[];
  maxStaff: number | null; // null = ไม่จำกัด
  maxTable: number | null;
  maxMenu: number | null;
  isActive: boolean;
  sortOrder: number;
}

// สรุปร้านสำหรับหน้า admin console
export interface ShopSummary {
  id: number;
  name: string;
  slug: string;
  status: ShopStatus;
  contactName: string | null;
  phone: string | null;
  createdAt: string;
  staffCount: number;
  tableCount: number;
  planKey: string | null; // null = ยังไม่ผูก plan (ถือเป็นฟรี)
  planName: string | null;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: string | null;
  requestedPlanKey: string | null; // คำขออัปเกรดที่ร้านกดไว้ รออนุมัติ (null = ไม่มี)
}

export interface CreateShopPayload {
  shopName: string;
  slug: string;
  staffUsername: string;
  staffPassword: string;
}

export interface CreateShopResult {
  shop: { id: number; name: string; slug: string; createdAt: string };
  staff: { id: number; username: string; shopId: number };
}

// พนักงานของร้าน (มุมมอง admin — สำหรับ reset รหัส)
export interface ShopStaff {
  id: number;
  username: string;
}

// payload ที่ร้านกรอกตอนสมัครเปิดร้านเอง (public)
export interface SignupPayload {
  shopName: string;
  contactName: string;
  phone?: string;
  staffUsername: string;
  staffPassword: string;
}
