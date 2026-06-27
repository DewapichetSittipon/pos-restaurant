// โดเมนหลัก (ดู CONTEXT.md) — เก็บเงินเป็น integer สตางค์

export type OrderItemStatus = 'queued' | 'cooking' | 'served' | 'voided';
export type BillStatus = 'pending' | 'paid' | 'refunded';
export type TableStatus = 'vacant' | 'occupied';
export type ServiceRequestType = 'call_staff' | 'call_bill';
export type ServiceRequestStatus = 'pending' | 'acknowledged';

export interface ModifierOption {
  id: number;
  name: string;
  priceDelta: number; // สตางค์ (0 = ไม่บวกเพิ่ม)
  isAvailable: boolean;
}

export interface ModifierGroup {
  id: number;
  name: string;
  minSelect: number; // 0 = ไม่บังคับ
  maxSelect: number; // เลือกได้สูงสุดกี่ตัว
  options: ModifierOption[];
}

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  price: number; // สตางค์
  stockCount: number | null; // null = ไม่นับสต็อก
  isAvailable: boolean;
  isArchived: boolean;
  imageUrl: string | null; // path รูป (null = ใช้ placeholder)
  modifierGroups?: ModifierGroup[]; // ตัวเลือก (ขนาด/ระดับ/ท็อปปิ้ง)
}

// ตัวเลือกที่ถูกเลือก (snapshot บน OrderItem)
export interface OrderItemModifier {
  id: number;
  name: string;
  priceDelta: number; // สตางค์
}

export interface Category {
  id: number;
  name: string;
  menus: MenuItem[];
}

export interface OrderItem {
  id: number;
  billId: number;
  menuId: number;
  batchId: string;
  quantity: number;
  unitPrice: number; // สตางค์
  itemName: string;
  note: string | null; // หมายเหตุ/คำขอพิเศษ
  voidReason: string | null; // เหตุผลตอนยกเลิก
  imageUrl: string | null; // snapshot รูปตอนสั่ง (null = ไม่มี/ใช้ placeholder)
  status: OrderItemStatus;
  createdAt: string; // เวลาสั่ง
  servedAt: string | null; // เวลาเสิร์ฟ
  modifiers?: OrderItemModifier[]; // ตัวเลือกที่เลือก (priceDelta รวมใน unitPrice แล้ว)
}

export interface ServiceRequest {
  id: number;
  billId: number;
  type: ServiceRequestType;
  status: ServiceRequestStatus;
  createdAt: string;
}

export interface TableInfo {
  id: number;
  tableNumber: string;
  status: TableStatus;
}

export type PaymentMethod = 'cash' | 'transfer';
export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export interface Bill {
  id: number;
  tableId: number | null;
  orderType: OrderType;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  deliveryFee: number; // สตางค์ ค่าส่ง (0 = ไม่มี)
  totalPrice: number | null;
  discount: number; // สตางค์ (default 0)
  serviceCharge: number; // สตางค์ (default 0) — เซอร์วิสชาร์จ snapshot
  serviceChargeRate: number; // basis points snapshot
  vatAmount: number; // สตางค์ (default 0) — VAT snapshot
  vatRate: number; // basis points snapshot
  vatInclusive: boolean; // โหมด VAT ตอนคิด
  paymentMethod: PaymentMethod | null;
  receivedAmount: number | null; // สตางค์ที่รับมา (เงินสด)
  memberId: number | null; // สมาชิกที่ผูกบิล
  pointsEarned: number; // แต้มที่ได้จากบิลนี้
  pointsRedeemed: number; // แต้มที่ใช้แลกส่วนลด
  status: BillStatus;
  receiptNumber: number | null; // เลขที่ใบเสร็จ/ใบกำกับภาษี (set ตอนชำระ)
  qrToken: string;
  createdAt: string;
  paidAt: string | null;
}

export interface Session extends Bill {
  table: TableInfo;
  orderItems: OrderItem[];
  serviceRequests: ServiceRequest[];
}

// ตะกร้าฝั่ง client (local ต่อเครื่อง — ดู decision multi-device)
// แต่ละบรรทัดมี lineId เฉพาะ เพราะเมนูเดียวกันที่เลือกตัวเลือกต่างกันต้องแยกบรรทัด
export interface CartLine {
  lineId: string;
  menuId: number;
  name: string;
  price: number; // สตางค์ ต่อหน่วย (รวมราคาตัวเลือกแล้ว)
  quantity: number;
  note?: string; // หมายเหตุที่ลูกค้ากรอกต่อรายการ
  imageUrl: string | null;
  selectedOptionIds: number[]; // ส่งให้ backend ตอนสั่ง
  modifiers: { name: string; priceDelta: number }[]; // ไว้โชว์ในตะกร้า
}
