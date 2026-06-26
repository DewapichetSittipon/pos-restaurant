// ผู้ดูแลแพลตฟอร์ม (เจ้าของระบบ SaaS) — แยกจาก Staff ของร้าน
export interface PlatformAdmin {
  id: number;
  username: string;
}

export type ShopStatus = 'pending' | 'active';

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
