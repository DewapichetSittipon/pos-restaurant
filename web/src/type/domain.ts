// โดเมนหลัก (ดู CONTEXT.md) — เก็บเงินเป็น integer สตางค์

export type OrderItemStatus = 'queued' | 'cooking' | 'served' | 'voided';
export type BillStatus = 'pending' | 'paid';
export type TableStatus = 'vacant' | 'occupied';
export type ServiceRequestType = 'call_staff' | 'call_bill';
export type ServiceRequestStatus = 'pending' | 'acknowledged';

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  price: number; // สตางค์
  stockCount: number | null; // null = ไม่นับสต็อก
  isAvailable: boolean;
  isArchived: boolean;
  imageUrl: string | null; // path รูป (null = ใช้ placeholder)
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
  imageUrl: string | null; // snapshot รูปตอนสั่ง (null = ไม่มี/ใช้ placeholder)
  status: OrderItemStatus;
  createdAt: string; // เวลาสั่ง
  servedAt: string | null; // เวลาเสิร์ฟ
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

export interface Bill {
  id: number;
  tableId: number;
  totalPrice: number | null;
  status: BillStatus;
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
export interface CartLine {
  menuId: number;
  name: string;
  price: number; // สตางค์
  quantity: number;
  imageUrl: string | null;
}
