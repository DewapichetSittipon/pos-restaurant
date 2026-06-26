import { api } from './api';
import type { OrderItem, OrderItemStatus, ServiceRequest } from '../type/domain';
import type {
  ActiveOrderItem,
  CheckoutResult,
  EodReport,
  OpenTableResult,
  Staff,
  TableGridItem,
} from '../type/staff';

export async function login(username: string, password: string): Promise<Staff> {
  const { data } = await api.post<{ staff: Staff }>('/auth/login', {
    username,
    password,
  });
  return data.staff;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function fetchMe(): Promise<Staff> {
  const { data } = await api.get<{ staff: Staff }>('/auth/me');
  return data.staff;
}

export async function fetchTables(): Promise<TableGridItem[]> {
  const { data } = await api.get<TableGridItem[]>('/tables');
  return data;
}

export async function openTable(tableId: number): Promise<OpenTableResult> {
  const { data } = await api.post<OpenTableResult>(`/tables/${tableId}/open`);
  return data;
}

export async function checkoutTable(tableId: number): Promise<CheckoutResult> {
  const { data } = await api.post<CheckoutResult>(`/tables/${tableId}/checkout`);
  return data;
}

export async function ackServiceRequest(id: number): Promise<ServiceRequest> {
  const { data } = await api.patch<ServiceRequest>(`/service-requests/${id}/ack`);
  return data;
}

export async function fetchActiveQueue(): Promise<ActiveOrderItem[]> {
  const { data } = await api.get<ActiveOrderItem[]>('/orders/active');
  return data;
}

export async function updateOrderStatus(
  id: number,
  status: Extract<OrderItemStatus, 'cooking' | 'served'>,
): Promise<OrderItem> {
  const { data } = await api.patch<OrderItem>(`/orders/${id}/status`, { status });
  return data;
}

export async function voidOrder(id: number): Promise<OrderItem> {
  const { data } = await api.post<OrderItem>(`/orders/${id}/void`);
  return data;
}

export async function fetchEod(date?: string): Promise<EodReport> {
  const { data } = await api.get<EodReport>('/reports/eod', {
    params: date ? { date } : undefined,
  });
  return data;
}
