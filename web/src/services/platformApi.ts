import { api } from './api';
import type {
  CreateShopPayload,
  CreateShopResult,
  PlatformAdmin,
  ShopSummary,
  SignupPayload,
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

// ----- สมัครเปิดร้านเอง -----

// public — ร้านสมัครเอง (ไม่ต้อง login) สร้างร้านสถานะ pending
export async function signup(payload: SignupPayload): Promise<void> {
  await api.post('/signup', payload);
}

// admin อนุมัติร้าน pending -> active
export async function approveShop(id: number): Promise<void> {
  await api.post(`/admin/shops/${id}/approve`);
}
