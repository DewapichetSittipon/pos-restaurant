// ผู้ดูแลแพลตฟอร์ม (เจ้าของระบบ SaaS) — แยกจาก Staff ของร้าน
export interface PlatformAdmin {
  id: number;
  username: string;
}

// สรุปร้านสำหรับหน้า admin console
export interface ShopSummary {
  id: number;
  name: string;
  slug: string;
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
