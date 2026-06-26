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
}

// payload ตอนเช็คบิล
export interface CheckoutPayload {
  discount?: number; // สตางค์
  paymentMethod: 'cash' | 'transfer';
  receivedAmount?: number; // สตางค์ (เงินสด)
}

export interface Staff {
  id: number;
  username: string;
  shopId: number; // tenant ของพนักงาน
  shopStatus: 'pending' | 'active'; // pending = รออนุมัติ ใช้งานไม่ได้
}

// พนักงานในร้าน (สำหรับหน้าจัดการพนักงาน)
export interface StaffMember {
  id: number;
  username: string;
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
}

export interface EodReport {
  date: string;
  timezone: string;
  billCount: number;
  totalSatang: number;
  bills: EodBillRow[];
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
  categories: BillDetailCategory[];
}

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}
