// ข้อมูลร้าน/หัวใบเสร็จ (จาก GET /shop)
export interface ShopInfo {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  taxId: string | null;
  promptpayId: string | null;
  vatRate: number; // basis points (700 = 7%); 0 = ไม่คิด VAT
  vatInclusive: boolean; // true = ราคาเมนูรวม VAT แล้ว
  serviceChargeRate: number; // basis points (1000 = 10%); 0 = ไม่คิด
  loyaltyEarnRate: number; // แต้มต่อ 100 บาท; 0 = ปิดระบบสมาชิก
}

// payload ตอนบันทึก (PATCH /shop) — ช่องว่างฝั่ง backend จะแปลงเป็น null
export interface UpdateShopInput {
  name: string;
  address: string;
  phone: string;
  taxId: string;
  promptpayId: string;
  vatRate: number; // basis points
  vatInclusive: boolean;
  serviceChargeRate: number; // basis points
  loyaltyEarnRate: number; // แต้มต่อ 100 บาท
}

// บันทึกการกระทำของพนักงาน (จาก GET /audit)
export interface AuditLogEntry {
  id: number;
  staffId: number | null;
  staffName: string;
  action: string;
  detail: string | null;
  createdAt: string;
}

// หมวดหมู่ + จำนวนเมนู (จาก GET /categories)
export interface CategoryRow {
  id: number;
  name: string;
  menuCount: number;
}

export interface CreateMenuInput {
  categoryId: number;
  name: string;
  price: number; // สตางค์
  stockCount: number | null;
}

export interface UpdateMenuInput {
  categoryId?: number;
  name?: string;
  price?: number; // สตางค์
  stockCount?: number | null;
  isAvailable?: boolean;
}
