import { api } from './api';
import type { OrderItem, OrderItemStatus, ServiceRequest } from '../type/domain';
import type {
  ActiveOrderItem,
  BillDetail,
  CheckoutPayload,
  CheckoutResult,
  EodReport,
  OpenTableResult,
  PrepTimesReport,
  Staff,
  StaffMember,
  StaffRole,
  TableBill,
  TableGridItem,
  TopMenusReport,
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

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await api.post('/auth/change-password', { currentPassword, newPassword });
}

export async function fetchMe(): Promise<Staff> {
  const { data } = await api.get<{ staff: Staff }>('/auth/me');
  return data.staff;
}

// ----- จัดการพนักงานในร้าน -----

export async function fetchStaff(): Promise<StaffMember[]> {
  const { data } = await api.get<StaffMember[]>('/staff');
  return data;
}

export async function createStaff(
  username: string,
  password: string,
  role: StaffRole,
): Promise<StaffMember> {
  const { data } = await api.post<StaffMember>('/staff', {
    username,
    password,
    role,
  });
  return data;
}

export async function setStaffPassword(
  id: number,
  password: string,
): Promise<void> {
  await api.patch(`/staff/${id}/password`, { password });
}

export async function deleteStaff(id: number): Promise<void> {
  await api.delete(`/staff/${id}`);
}

export async function fetchTables(): Promise<TableGridItem[]> {
  const { data } = await api.get<TableGridItem[]>('/tables');
  return data;
}

export async function openTable(tableId: number): Promise<OpenTableResult> {
  const { data } = await api.post<OpenTableResult>(`/tables/${tableId}/open`);
  return data;
}

// พนักงานคีย์ออเดอร์ให้โต๊ะ (เพิ่มรายการเข้าบิลที่เปิดอยู่)
export async function addStaffOrder(
  tableId: number,
  items: { menuId: number; quantity: number; note?: string }[],
): Promise<void> {
  await api.post('/orders/staff', { tableId, items });
}

// ดูบิลที่เปิดอยู่ของโต๊ะ (รายการที่สั่งไปแล้ว + สถานะ)
export async function fetchTableBill(tableId: number): Promise<TableBill> {
  const { data } = await api.get<TableBill>(`/tables/${tableId}/bill`);
  return data;
}

// ย้ายบิลที่เปิดอยู่ไปโต๊ะอื่น
export async function transferBill(
  fromTableId: number,
  toTableId: number,
): Promise<void> {
  await api.post(`/tables/${fromTableId}/transfer`, { toTableId });
}

// รวมบิลโต๊ะต้นทางเข้ากับโต๊ะปลายทาง (toTableId = โต๊ะที่เก็บไว้)
export async function mergeBill(
  toTableId: number,
  fromTableId: number,
): Promise<void> {
  await api.post(`/tables/${toTableId}/merge`, { fromTableId });
}

export async function checkoutTable(
  tableId: number,
  payload: CheckoutPayload,
): Promise<CheckoutResult> {
  const { data } = await api.post<CheckoutResult>(
    `/tables/${tableId}/checkout`,
    payload,
  );
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

export async function voidOrder(
  id: number,
  reason?: string,
): Promise<OrderItem> {
  const { data } = await api.post<OrderItem>(`/orders/${id}/void`, { reason });
  return data;
}

export async function fetchEod(date?: string): Promise<EodReport> {
  const { data } = await api.get<EodReport>('/reports/eod', {
    params: date ? { date } : undefined,
  });
  return data;
}

export async function fetchTopMenus(date?: string): Promise<TopMenusReport> {
  const { data } = await api.get<TopMenusReport>('/reports/top-menus', {
    params: date ? { date } : undefined,
  });
  return data;
}

export async function fetchPrepTimes(date?: string): Promise<PrepTimesReport> {
  const { data } = await api.get<PrepTimesReport>('/reports/prep-times', {
    params: date ? { date } : undefined,
  });
  return data;
}

export async function fetchBillDetail(billId: number): Promise<BillDetail> {
  const { data } = await api.get<BillDetail>(`/reports/bills/${billId}`);
  return data;
}

// ข้อมูลบิลสำหรับพิมพ์ใบเสร็จซ้ำ
export async function fetchBillReceipt(
  billId: number,
): Promise<CheckoutResult> {
  const { data } = await api.get<CheckoutResult>(
    `/reports/bills/${billId}/receipt`,
  );
  return data;
}
