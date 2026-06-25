// ศัพท์/ชนิดข้อมูลที่ใช้ร่วมกันระหว่าง backend และ web
// ดู CONTEXT.md สำหรับความหมายของแต่ละคำ

export const TableStatus = {
  Vacant: 'vacant',
  Occupied: 'occupied',
} as const;
export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

export const BillStatus = {
  Pending: 'pending',
  Paid: 'paid',
} as const;
export type BillStatus = (typeof BillStatus)[keyof typeof BillStatus];

export const OrderItemStatus = {
  Queued: 'queued',
  Cooking: 'cooking',
  Served: 'served',
  Voided: 'voided',
} as const;
export type OrderItemStatus =
  (typeof OrderItemStatus)[keyof typeof OrderItemStatus];

export const StaffRole = {
  Admin: 'admin',
  Kitchen: 'kitchen',
} as const;
export type StaffRole = (typeof StaffRole)[keyof typeof StaffRole];

export const ServiceRequestType = {
  CallStaff: 'call_staff',
  CallBill: 'call_bill',
} as const;
export type ServiceRequestType =
  (typeof ServiceRequestType)[keyof typeof ServiceRequestType];

export const ServiceRequestStatus = {
  Pending: 'pending',
  Acknowledged: 'acknowledged',
} as const;
export type ServiceRequestStatus =
  (typeof ServiceRequestStatus)[keyof typeof ServiceRequestStatus];

// Socket.io: push อย่างเดียว (server -> client) ดู ADR-0006
export const SocketEvent = {
  OrderCreated: 'order.created',
  OrderItemStatusChanged: 'orderItem.statusChanged',
  ServiceRequestCreated: 'serviceRequest.created',
  ServiceRequestAcknowledged: 'serviceRequest.acknowledged',
  TableOpened: 'table.opened',
  BillClosed: 'bill.closed',
} as const;
export type SocketEvent = (typeof SocketEvent)[keyof typeof SocketEvent];

export const socketRooms = {
  table: (billId: number) => `table:${billId}`,
  kitchen: 'kitchen',
  admin: 'admin',
} as const;

// helper: เก็บเงินเป็น integer สตางค์ทุกที่ (ดู plan.md)
export const satangToBaht = (satang: number): number => satang / 100;
export const bahtToSatang = (baht: number): number => Math.round(baht * 100);
export const formatBaht = (satang: number): string =>
  new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
  }).format(satang / 100);
