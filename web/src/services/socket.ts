import { io, type Socket } from 'socket.io-client';

// prod: VITE_API_URL ว่าง → undefined → socket.io เชื่อม same-origin (ผ่าน Worker proxy)
// dev: ใช้ backend localhost ตรง ๆ
const url = import.meta.env.VITE_API_URL || undefined;

// ต้องตรงกับ backend (ดู ADR-0006 / shared/src/index.ts)
export const SOCKET_EVENTS = {
  orderCreated: 'order.created',
  orderItemStatusChanged: 'orderItem.statusChanged',
  serviceRequestCreated: 'serviceRequest.created',
  serviceRequestAcknowledged: 'serviceRequest.acknowledged',
  tableOpened: 'table.opened',
  billClosed: 'bill.closed',
} as const;

// staff เชื่อม socket ด้วย JWT cookie (httpOnly) -> join ห้องของร้าน staff:{shopId}
export function createStaffSocket(): Socket {
  return io(url, {
    withCredentials: true,
    transports: ['websocket'],
  });
}

// ลูกค้าเชื่อม socket ด้วย qr_token ผ่าน handshake.auth.token (ดู EventsGateway)
export function createCustomerSocket(token: string): Socket {
  return io(url, {
    auth: { token },
    withCredentials: true,
    transports: ['websocket'],
  });
}
