import type {
  Bill,
  OrderItem,
  ServiceRequest,
  TableInfo,
} from './domain';

// ผลลัพธ์ตอนเปิดโต๊ะ (backend ส่ง customerUrl มาด้วย)
export interface OpenTableResult extends Bill {
  table: TableInfo;
  customerUrl: string;
}

// บิลกลับบ้าน/เดลิเวอรีที่เปิดอยู่ (พร้อมรายการ + ยอดสด)
export interface TakeawayBill extends Bill {
  orderItems: OrderItem[];
}

// สมาชิก/แต้มสะสม
export interface Member {
  id: number;
  phone: string;
  name: string | null;
  birthDate: string | null; // ISO date (YYYY-MM-DD...) หรือ null
  points: number;
  createdAt: string;
}

// โปรโมชันแบบมีกฎ (rule-based discount)
export type PromotionType = 'percent' | 'amount' | 'bogo';

export interface Promotion {
  id: number;
  shopId: number;
  name: string;
  type: PromotionType;
  value: number; // percent → basis points; amount → สตางค์
  minSubtotal: number; // สตางค์
  maxDiscount: number | null; // สตางค์
  startMinute: number | null; // นาทีจากเที่ยงคืน (เวลาไทย)
  endMinute: number | null;
  daysOfWeek: number; // bitmask
  buyQty: number;
  getQty: number;
  membersOnly: boolean;
  birthdayOnly: boolean;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

// payload สร้าง/แก้โปร (ฝั่ง client) — ฟิลด์ตรงกับ Promotion ยกเว้น id/shopId/createdAt
export type PromotionInput = Omit<Promotion, 'id' | 'shopId' | 'createdAt'>;

// โปรที่ใช้ได้กับบิลตอนนี้ + ส่วนลดที่คำนวณแล้ว
export interface ApplicablePromotion {
  promotion: Promotion;
  discount: number; // สตางค์
}

// ผลลัพธ์ตอนเช็คบิล — มีข้อมูลครบสำหรับพิมพ์ใบเสร็จ
export interface CheckoutResult extends Bill {
  subtotal: number; // สตางค์ ก่อนหักส่วนลด
  table: Pick<TableInfo, 'id' | 'tableNumber'>;
  shop: {
    name: string;
    address: string | null;
    phone: string | null;
    taxId: string | null;
    promptpayId: string | null;
  };
  orderItems: OrderItem[];
  member: {
    name: string | null;
    pointsBalance: number;
    pointsEarned: number;
    pointsRedeemed: number;
  } | null;
}

// payload ตอนเช็คบิล
export interface CheckoutPayload {
  discount?: number; // สตางค์ (ส่วนลดมือ)
  paymentMethod: 'cash' | 'transfer';
  receivedAmount?: number; // สตางค์ (เงินสด)
  memberId?: number; // สมาชิกที่ผูกบิล
  redeemPoints?: number; // แต้มที่ขอแลก
  promotionId?: number; // โปรโมชันที่เลือกใช้
}

// บทบาทพนักงานในร้าน (ตรงกับ enum StaffRole ฝั่ง backend)
export type StaffRole = 'OWNER' | 'WAITER' | 'KITCHEN';

export interface Staff {
  id: number;
  username: string;
  shopId: number; // tenant ของพนักงาน
  role: StaffRole; // OWNER เห็นทุกหน้า, WAITER เห็นผังโต๊ะ, KITCHEN เห็นครัว
  shopStatus: 'pending' | 'active'; // pending = รออนุมัติ ใช้งานไม่ได้
}

// พนักงานในร้าน (สำหรับหน้าจัดการพนักงาน)
export interface StaffMember {
  id: number;
  username: string;
  role: StaffRole;
}

// โต๊ะ + บิล pending (พร้อม service request) สำหรับ grid หลังบ้าน
export interface TableGridItem extends TableInfo {
  bills: (Bill & { serviceRequests: ServiceRequest[] })[];
}

// บิลที่เปิดอยู่ของโต๊ะ + รายการที่สั่ง (ฝั่งพนักงานดู)
export interface TableBill {
  id: number;
  totalPrice: number; // สตางค์ (ยอดสด ไม่นับ voided)
  orderItems: OrderItem[];
}

// รายการในคิวครัว (queued/cooking) พร้อมข้อมูลโต๊ะ
export interface ActiveOrderItem extends OrderItem {
  bill: Bill & { table: TableInfo };
}

export interface EodBillRow {
  id: number;
  tableNumber: string;
  totalSatang: number;
  paidAt: string;
  status: 'paid' | 'refunded';
}

export interface EodReport {
  date: string;
  timezone: string;
  billCount: number;
  totalSatang: number;
  vatSatang: number;
  serviceChargeSatang: number;
  cashSatang: number;
  transferSatang: number;
  refundedCount: number;
  refundedSatang: number;
  bills: EodBillRow[];
}

// ----- กะ/เงินลิ้นชัก -----
export interface ShiftSummary {
  billCount: number;
  cashSatang: number;
  transferSatang: number;
  totalSatang: number;
  expectedCashSatang: number; // เงินสดที่ควรมีในลิ้นชัก
  countedCashSatang: number | null; // ที่นับได้จริง (กะที่ปิดแล้ว)
  diffSatang: number | null; // ผลต่าง (+เกิน / -ขาด)
}

export interface Shift {
  id: number;
  shopId: number;
  status: 'open' | 'closed';
  openingCash: number; // สตางค์ เงินทอนตั้งต้น
  openedByStaffId: number;
  openedByName: string;
  openedAt: string;
  closingCashCounted: number | null;
  closedByStaffId: number | null;
  closedByName: string | null;
  closedAt: string | null;
  note: string | null;
  summary: ShiftSummary;
}

export interface HourlyRow {
  hour: number; // 0–23
  totalSatang: number;
  billCount: number;
}

export interface HourlyReport {
  date: string;
  hours: HourlyRow[];
}

export interface RangeDayRow {
  date: string;
  totalSatang: number;
  billCount: number;
}

export interface RangeReport {
  from: string;
  to: string;
  totalSatang: number;
  billCount: number;
  days: RangeDayRow[];
}

export interface TopMenuRow {
  itemName: string;
  quantity: number;
  revenueSatang: number;
}

export interface TopMenusReport {
  date: string;
  menus: TopMenuRow[];
}

export interface PrepTimeRow {
  itemName: string;
  avgSec: number; // เวลาเฉลี่ยจากสั่ง→เสิร์ฟ (วินาที)
  count: number;
}

export interface PrepTimesReport {
  date: string;
  servedCount: number;
  overallAvgSec: number;
  menus: PrepTimeRow[];
}

export interface BillDetailItem {
  id: number;
  itemName: string;
  quantity: number;
  unitPrice: number; // สตางค์
  lineSatang: number; // unitPrice * quantity
}

export interface BillDetailCategory {
  categoryId: number;
  categoryName: string;
  items: BillDetailItem[];
  subtotalSatang: number;
}

export interface BillDetail {
  billId: number;
  tableNumber: string;
  paidAt: string;
  totalSatang: number;
  status: 'paid' | 'refunded';
  refundReason: string | null;
  refundedAt: string | null;
  refundedByName: string | null;
  categories: BillDetailCategory[];
}

// ----- การจองโต๊ะ -----
export type ReservationStatus = 'booked' | 'seated' | 'cancelled';

export interface Reservation {
  id: number;
  customerName: string;
  phone: string | null;
  partySize: number;
  reservedAt: string;
  tableId: number | null;
  table: { id: number; tableNumber: string } | null;
  note: string | null;
  status: ReservationStatus;
  createdAt: string;
}

export interface CreateReservationInput {
  customerName: string;
  phone?: string;
  partySize: number;
  reservedAt: string; // ISO
  tableId?: number;
  note?: string;
}

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}
