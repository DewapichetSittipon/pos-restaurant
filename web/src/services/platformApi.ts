import { api } from './api';
import type {
  CreateShopPayload,
  CreateShopResult,
  PlatformAdmin,
  ShopRequest,
  ShopSummary,
  SubmitShopRequestPayload,
} from '../type/platform';

export async function adminLogin(
  username: string,
  password: string,
): Promise<PlatformAdmin> {
  const { data } = await api.post<{ admin: PlatformAdmin }>('/admin/login', {
    username,
    password,
  });
  return data.admin;
}

export async function adminLogout(): Promise<void> {
  await api.post('/admin/logout');
}

export async function fetchAdminMe(): Promise<PlatformAdmin> {
  const { data } = await api.get<{ admin: PlatformAdmin }>('/admin/me');
  return data.admin;
}

export async function fetchShops(): Promise<ShopSummary[]> {
  const { data } = await api.get<ShopSummary[]>('/admin/shops');
  return data;
}

export async function createShop(
  payload: CreateShopPayload,
): Promise<CreateShopResult> {
  const { data } = await api.post<CreateShopResult>('/admin/shops', payload);
  return data;
}

export async function deleteShop(id: number): Promise<void> {
  await api.delete(`/admin/shops/${id}`);
}

// ----- คำขอเปิดร้าน -----

// public — ร้านค้าส่งคำขอ (ไม่ต้อง login)
export async function submitShopRequest(
  payload: SubmitShopRequestPayload,
): Promise<{ id: number; status: string }> {
  const { data } = await api.post<{ id: number; status: string }>(
    '/shop-requests',
    payload,
  );
  return data;
}

export async function fetchShopRequests(): Promise<ShopRequest[]> {
  const { data } = await api.get<ShopRequest[]>('/admin/shop-requests');
  return data;
}

// อนุมัติ: admin กำหนด slug + login ของร้าน
export async function approveShopRequest(
  id: number,
  payload: CreateShopPayload,
): Promise<CreateShopResult> {
  const { data } = await api.post<CreateShopResult>(
    `/admin/shop-requests/${id}/approve`,
    payload,
  );
  return data;
}

export async function rejectShopRequest(
  id: number,
  adminNote?: string,
): Promise<void> {
  await api.post(`/admin/shop-requests/${id}/reject`, { adminNote });
}
