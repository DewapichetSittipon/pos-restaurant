import { api } from './api';
import type { Category, TableInfo } from '../type/domain';
import type {
  AuditLogEntry,
  CategoryRow,
  ComboComponentInput,
  CreateComboInput,
  CreateMenuInput,
  ModifierGroupInput,
  ShopInfo,
  SubscriptionSummary,
  TranslatedNameInput,
  UpdateMenuInput,
  UpdateShopInput,
} from '../type/manage';
import type { ModifierGroup } from '../type/domain';

// ----- ข้อมูลร้าน / หัวใบเสร็จ -----
export async function fetchShop(): Promise<ShopInfo> {
  const { data } = await api.get<ShopInfo>('/shop');
  return data;
}

export async function updateShop(input: UpdateShopInput): Promise<ShopInfo> {
  const { data } = await api.patch<ShopInfo>('/shop', input);
  return data;
}

// แพ็กเกจ + โควต้าที่ใช้ไปของร้าน (ฝั่งเจ้าของร้าน)
export async function fetchSubscription(): Promise<SubscriptionSummary> {
  const { data } = await api.get<SubscriptionSummary>('/shop/subscription');
  return data;
}

// ร้านกดขออัปเกรดแพ็กเกจ (รออนุมัติ — จ่ายเงิน manual)
export async function requestPlanUpgrade(
  planKey: string,
): Promise<SubscriptionSummary> {
  const { data } = await api.post<SubscriptionSummary>(
    '/shop/subscription/request',
    { planKey },
  );
  return data;
}

// ร้านยกเลิกคำขออัปเกรดที่ยังรออนุมัติ
export async function cancelPlanRequest(): Promise<SubscriptionSummary> {
  const { data } = await api.delete<SubscriptionSummary>(
    '/shop/subscription/request',
  );
  return data;
}

// ----- บันทึกการกระทำ (audit log) -----
export async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  const { data } = await api.get<AuditLogEntry[]>('/audit');
  return data;
}

// ----- โต๊ะ -----
export async function createTable(tableNumber: string): Promise<TableInfo> {
  const { data } = await api.post<TableInfo>('/tables', { tableNumber });
  return data;
}

export async function deleteTable(id: number): Promise<void> {
  await api.delete(`/tables/${id}`);
}

// ----- หมวดหมู่ -----
export async function fetchCategories(): Promise<CategoryRow[]> {
  const { data } = await api.get<CategoryRow[]>('/categories');
  return data;
}

export async function createCategory(
  name: string,
  translations?: TranslatedNameInput,
): Promise<void> {
  await api.post('/categories', { name, ...translations });
}

export async function renameCategory(
  id: number,
  name: string,
  translations?: TranslatedNameInput,
): Promise<void> {
  await api.patch(`/categories/${id}`, { name, ...translations });
}

export async function deleteCategory(id: number): Promise<void> {
  await api.delete(`/categories/${id}`);
}

// ----- เมนู (catalog ใช้ร่วมกับฝั่ง ordering: GET /menus คืน Category[] พร้อม menus) -----
export async function fetchCatalog(): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/menus');
  return data;
}

export async function createMenu(input: CreateMenuInput): Promise<void> {
  await api.post('/menus', input);
}

export async function updateMenu(
  id: number,
  input: UpdateMenuInput,
): Promise<void> {
  await api.patch(`/menus/${id}`, input);
}

export async function archiveMenu(id: number): Promise<void> {
  await api.delete(`/menus/${id}`);
}

export async function uploadMenuImage(id: number, file: File): Promise<void> {
  const fd = new FormData();
  fd.append('image', file);
  await api.post(`/menus/${id}/image`, fd);
}

export async function clearMenuImage(id: number): Promise<void> {
  await api.delete(`/menus/${id}/image`);
}

// ----- ชุด/คอมโบ -----
// สร้างชุด (เมนู isCombo + ส่วนประกอบ); แก้ชื่อ/ราคา/รูป/งดขาย ใช้ updateMenu/archiveMenu เดิม
export async function createCombo(input: CreateComboInput): Promise<void> {
  await api.post('/menus/combos', input);
}

// แทนที่รายการส่วนประกอบของชุดทั้งชุด
export async function setComboComponents(
  menuId: number,
  components: ComboComponentInput[],
): Promise<void> {
  await api.put(`/menus/${menuId}/combo-components`, { components });
}

// ตั้งค่าตัวเลือก (modifiers) ของเมนู — แทนที่ทั้งชุด
export async function setMenuModifiers(
  menuId: number,
  groups: ModifierGroupInput[],
): Promise<ModifierGroup[]> {
  const { data } = await api.put<ModifierGroup[]>(
    `/menus/${menuId}/modifiers`,
    { groups },
  );
  return data;
}
