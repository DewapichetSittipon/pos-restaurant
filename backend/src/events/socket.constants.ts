// สำเนาฝั่ง backend ของ event/room names (ดูตัวต้นทางที่ shared/src/index.ts, ADR-0006)
// แยกไว้เพื่อเลี่ยงการ build ข้าม workspace; ต้องให้ตรงกับ @pos-res/shared

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
  // หนึ่งห้องต่อร้าน — staff ทุกคนของร้าน (รวมจอครัว) อยู่ห้องเดียวกัน
  staff: (shopId: number) => `staff:${shopId}`,
} as const;
