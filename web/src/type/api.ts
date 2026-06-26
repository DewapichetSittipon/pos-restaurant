import type { OrderItem, ServiceRequestType } from './domain';

export interface CreateOrderPayload {
  items: { menuId: number; quantity: number; note?: string }[];
}

export interface CreateServiceRequestPayload {
  type: ServiceRequestType;
}

// payload ของ socket events (server -> client) ดู ADR-0006
export interface OrderCreatedEvent {
  billId: number;
  batchId: string;
  items: OrderItem[];
}

export interface BillClosedEvent {
  billId: number;
  totalPrice: number;
}

export type SessionStatus = 'loading' | 'ready' | 'closed' | 'invalid';
