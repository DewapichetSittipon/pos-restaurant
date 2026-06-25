import { api } from './api';
import type { Category, ServiceRequest, Session } from '../type/domain';
import type {
  CreateOrderPayload,
  CreateServiceRequestPayload,
  OrderCreatedEvent,
} from '../type/api';

export async function fetchMenus(): Promise<Category[]> {
  // เมนูของร้านที่ผูกกับ qr_token (scope ฝั่ง backend ด้วย bill.shopId)
  const { data } = await api.get<Category[]>('/customer/menus');
  return data;
}

export async function fetchSession(): Promise<Session> {
  const { data } = await api.get<Session>('/customer/session');
  return data;
}

export async function submitOrder(
  payload: CreateOrderPayload,
): Promise<OrderCreatedEvent> {
  const { data } = await api.post<OrderCreatedEvent>('/orders', payload);
  return data;
}

export async function requestService(
  payload: CreateServiceRequestPayload,
): Promise<ServiceRequest> {
  const { data } = await api.post<ServiceRequest>('/service-requests', payload);
  return data;
}
