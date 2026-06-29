import { api } from './api';
import type {
  Bill,
  OrderItem,
  OrderItemStatus,
  OrderType,
  ServiceRequest,
} from '../type/domain';
import type {
  ActiveOrderItem,
  ApplicablePromotion,
  BillDetail,
  CheckoutPayload,
  CheckoutResult,
  CreateReservationInput,
  EodReport,
  HourlyReport,
  Member,
  OpenTableResult,
  PrepTimesReport,
  Promotion,
  PromotionInput,
  RangeReport,
  Reservation,
  Shift,
  Staff,
  StaffMember,
  StaffRole,
  TableBill,
  TableGridItem,
  TakeawayBill,
  TopMenusReport,
} from '../type/staff';

export interface CreateTakeawayInput {
  orderType: Exclude<OrderType, 'dine_in'>;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryFee?: number; // สตางค์
}

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

// แยกบิล: ย้ายรายการที่เลือกจากโต๊ะนี้ไปเปิดบิลใหม่ที่โต๊ะว่าง
export async function splitBill(
  fromTableId: number,
  toTableId: number,
  orderItemIds: number[],
): Promise<void> {
  await api.post(`/tables/${fromTableId}/split`, { toTableId, orderItemIds });
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

// --- กลับบ้าน / เดลิเวอรี ---
export async function fetchTakeawayBills(): Promise<TakeawayBill[]> {
  const { data } = await api.get<TakeawayBill[]>('/tables/takeaway/list');
  return data;
}

export async function createTakeawayBill(
  input: CreateTakeawayInput,
): Promise<Bill> {
  const { data } = await api.post<Bill>('/tables/takeaway', input);
  return data;
}

export async function addOrderToBill(
  billId: number,
  items: {
    menuId: number;
    quantity: number;
    note?: string;
    modifierOptionIds?: number[];
  }[],
): Promise<void> {
  await api.post(`/orders/staff/bill/${billId}`, { items });
}

export async function checkoutTakeawayBill(
  billId: number,
  payload: CheckoutPayload,
): Promise<CheckoutResult> {
  const { data } = await api.post<CheckoutResult>(
    `/tables/takeaway/${billId}/checkout`,
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

export async function fetchHourly(date?: string): Promise<HourlyReport> {
  const { data } = await api.get<HourlyReport>('/reports/hourly', {
    params: date ? { date } : undefined,
  });
  return data;
}

export async function fetchRange(
  from: string,
  to: string,
): Promise<RangeReport> {
  const { data } = await api.get<RangeReport>('/reports/range', {
    params: { from, to },
  });
  return data;
}

// ดาวน์โหลดบิลในช่วงเป็น CSV (trigger ดาวน์โหลดในเบราว์เซอร์)
export async function downloadSalesCsv(
  from: string,
  to: string,
): Promise<void> {
  const res = await api.get('/reports/export', {
    params: { from, to },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sales_${from}_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
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

// คืนเงินบิลที่ชำระแล้ว (OWNER)
export async function refundBill(
  billId: number,
  reason: string,
  restoreStock: boolean,
): Promise<void> {
  await api.post(`/reports/bills/${billId}/refund`, { reason, restoreStock });
}

// ----- สมาชิก/แต้มสะสม -----
export async function fetchMembers(): Promise<Member[]> {
  const { data } = await api.get<Member[]>('/members');
  return data;
}

// ค้นหาสมาชิกด้วยเบอร์ — null ถ้าไม่พบ (404)
export async function lookupMember(phone: string): Promise<Member | null> {
  try {
    const { data } = await api.get<Member>('/members', { params: { phone } });
    return data;
  } catch {
    return null;
  }
}

export async function createMember(
  phone: string,
  name?: string,
  birthDate?: string,
): Promise<Member> {
  const { data } = await api.post<Member>('/members', {
    phone,
    name,
    birthDate: birthDate || undefined,
  });
  return data;
}

export async function updateMember(
  id: number,
  input: { name?: string; birthDate?: string },
): Promise<Member> {
  const { data } = await api.patch<Member>(`/members/${id}`, input);
  return data;
}

// ----- โปรโมชัน -----
export async function fetchPromotions(): Promise<Promotion[]> {
  const { data } = await api.get<Promotion[]>('/promotions');
  return data;
}

export async function createPromotion(
  input: PromotionInput,
): Promise<Promotion> {
  const { data } = await api.post<Promotion>('/promotions', input);
  return data;
}

export async function updatePromotion(
  id: number,
  input: Partial<PromotionInput>,
): Promise<Promotion> {
  const { data } = await api.patch<Promotion>(`/promotions/${id}`, input);
  return data;
}

export async function deletePromotion(id: number): Promise<void> {
  await api.delete(`/promotions/${id}`);
}

// โปรที่ใช้ได้กับบิลตอนนี้ (+ สมาชิกที่เลือก) พร้อมส่วนลดที่คำนวณแล้ว
export async function fetchApplicablePromotions(
  billId: number,
  memberId?: number,
): Promise<ApplicablePromotion[]> {
  const { data } = await api.get<ApplicablePromotion[]>(
    '/promotions/applicable',
    { params: { billId, memberId } },
  );
  return data;
}

// ----- การจองโต๊ะ -----
export async function fetchReservations(date?: string): Promise<Reservation[]> {
  const { data } = await api.get<Reservation[]>('/reservations', {
    params: date ? { date } : undefined,
  });
  return data;
}

export async function createReservation(
  input: CreateReservationInput,
): Promise<Reservation> {
  const { data } = await api.post<Reservation>('/reservations', input);
  return data;
}

export async function updateReservationStatus(
  id: number,
  status: 'seated' | 'cancelled',
): Promise<void> {
  await api.patch(`/reservations/${id}/status`, { status });
}

export async function deleteReservation(id: number): Promise<void> {
  await api.delete(`/reservations/${id}`);
}

// ----- กะ/เงินลิ้นชัก -----
export async function fetchCurrentShift(): Promise<Shift | null> {
  const { data } = await api.get<{ shift: Shift | null }>('/shifts/current');
  return data.shift;
}

export async function fetchShifts(): Promise<Shift[]> {
  const { data } = await api.get<Shift[]>('/shifts');
  return data;
}

export async function openShift(openingCash: number): Promise<Shift> {
  const { data } = await api.post<Shift>('/shifts/open', { openingCash });
  return data;
}

export async function closeShift(
  closingCashCounted: number,
  note?: string,
): Promise<Shift> {
  const { data } = await api.post<Shift>('/shifts/close', {
    closingCashCounted,
    note,
  });
  return data;
}
