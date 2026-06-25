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

export interface Staff {
  id: number;
  username: string;
  shopId: number; // tenant ของพนักงาน
}

// โต๊ะ + บิล pending (พร้อม service request) สำหรับ grid หลังบ้าน
export interface TableGridItem extends TableInfo {
  bills: (Bill & { serviceRequests: ServiceRequest[] })[];
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

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}
