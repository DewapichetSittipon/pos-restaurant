// ข้อมูลร้าน/หัวใบเสร็จ (จาก GET /shop)
export interface ShopInfo {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  taxId: string | null;
  promptpayId: string | null;
}

// payload ตอนบันทึก (PATCH /shop) — ช่องว่างฝั่ง backend จะแปลงเป็น null
export interface UpdateShopInput {
  name: string;
  address: string;
  phone: string;
  taxId: string;
  promptpayId: string;
}

// หมวดหมู่ + จำนวนเมนู (จาก GET /categories)
export interface CategoryRow {
  id: number;
  name: string;
  menuCount: number;
}

export interface CreateMenuInput {
  categoryId: number;
  name: string;
  price: number; // สตางค์
  stockCount: number | null;
}

export interface UpdateMenuInput {
  categoryId?: number;
  name?: string;
  price?: number; // สตางค์
  stockCount?: number | null;
  isAvailable?: boolean;
}
