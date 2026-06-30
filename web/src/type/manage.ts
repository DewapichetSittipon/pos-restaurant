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

// แพ็กเกจในมุมมองร้าน (subset — ไม่มี id/isActive/sortOrder)
export interface PlanView {
  key: string;
  name: string;
  priceMonthly: number; // สตางค์/เดือน
  features: string[]; // feature key ที่ปลดล็อก
  maxStaff: number | null; // null = ไม่จำกัด
  maxTable: number | null;
  maxMenu: number | null;
}

// สรุปแพ็กเกจ + โควต้าที่ใช้ไปของร้าน (จาก GET /shop/subscription)
export interface SubscriptionSummary {
  plan: PlanView | null;
  subscriptionStatus:
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  requestedPlanKey: string | null; // แพ็กเกจที่กดขอไว้ รออนุมัติ (null = ไม่มี)
  platformPromptPay: string | null; // PromptPay แพลตฟอร์ม (ไว้สร้าง QR ต่ออายุ/เปลี่ยนแพ็กเกจ)
  usage: { staff: number; table: number; menu: number };
  availablePlans: PlanView[]; // แพ็กเกจที่เปิดให้เลือก (สำหรับกดขออัปเกรด)
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
// ชื่อแปลอังกฤษ/จีน (ว่าง = ใช้ name ไทย) — ฝั่งลูกค้าเลือกตามภาษา
export interface TranslatedNameInput {
  nameEn?: string | null;
  nameZh?: string | null;
}

export interface CategoryRow extends TranslatedNameInput {
  id: number;
  name: string;
  menuCount: number;
}

export interface CreateMenuInput extends TranslatedNameInput {
  categoryId: number;
  name: string;
  price: number; // สตางค์
  stockCount: number | null;
}

export interface UpdateMenuInput extends TranslatedNameInput {
  categoryId?: number;
  name?: string;
  price?: number; // สตางค์
  stockCount?: number | null;
  isAvailable?: boolean;
}

// payload ตั้งค่าตัวเลือกของเมนู (แทนที่ทั้งชุด) — ส่งให้ PUT /menus/:id/modifiers
export interface ModifierOptionInput extends TranslatedNameInput {
  name: string;
  priceDelta: number; // สตางค์
  isAvailable?: boolean;
}

export interface ModifierGroupInput extends TranslatedNameInput {
  name: string;
  minSelect: number;
  maxSelect: number;
  options: ModifierOptionInput[];
}

// payload สร้างชุด/คอมโบ (POST /menus/combos)
export interface ComboComponentInput {
  menuId: number;
  quantity: number;
}

export interface CreateComboInput extends TranslatedNameInput {
  categoryId: number;
  name: string;
  price: number; // สตางค์ — ราคาคงที่ทั้งเซต
  components: ComboComponentInput[];
}
