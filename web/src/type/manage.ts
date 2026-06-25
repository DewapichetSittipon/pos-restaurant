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
