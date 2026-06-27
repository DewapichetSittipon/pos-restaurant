import { create } from 'zustand';
import type { CartLine, MenuItem, ModifierOption } from '../type/domain';

interface CartState {
  lines: CartLine[];
  // เพิ่มเมนู (พร้อมตัวเลือกที่เลือก) — เมนูเดียวกัน+ตัวเลือกเดียวกันจะรวมจำนวน
  addLine: (menu: MenuItem, options: ModifierOption[]) => void;
  // ทางลัดสำหรับเมนูที่ไม่มีตัวเลือก
  addItem: (menu: MenuItem) => void;
  increment: (lineId: string) => void;
  decrement: (lineId: string) => void;
  setNote: (lineId: string, note: string) => void;
  removeItem: (lineId: string) => void;
  clear: () => void;
}

// คีย์เทียบว่าเป็นบรรทัดเดียวกัน (เมนู + ชุดตัวเลือกที่เรียงแล้ว)
function sig(menuId: number, optionIds: number[]): string {
  return `${menuId}:${[...optionIds].sort((a, b) => a - b).join(',')}`;
}

export const useCartStore = create<CartState>((set) => ({
  lines: [],
  addLine: (menu, options) =>
    set((state) => {
      const optionIds = options.map((o) => o.id);
      const key = sig(menu.id, optionIds);
      const existing = state.lines.find(
        (l) => sig(l.menuId, l.selectedOptionIds) === key,
      );
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.lineId === existing.lineId
              ? { ...l, quantity: l.quantity + 1 }
              : l,
          ),
        };
      }
      const delta = options.reduce((s, o) => s + o.priceDelta, 0);
      return {
        lines: [
          ...state.lines,
          {
            lineId: crypto.randomUUID(),
            menuId: menu.id,
            name: menu.name,
            price: menu.price + delta,
            quantity: 1,
            imageUrl: menu.imageUrl,
            selectedOptionIds: optionIds,
            modifiers: options.map((o) => ({
              name: o.name,
              priceDelta: o.priceDelta,
            })),
          },
        ],
      };
    }),
  addItem: (menu) =>
    set((state) => {
      const key = sig(menu.id, []);
      const existing = state.lines.find(
        (l) => sig(l.menuId, l.selectedOptionIds) === key,
      );
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.lineId === existing.lineId
              ? { ...l, quantity: l.quantity + 1 }
              : l,
          ),
        };
      }
      return {
        lines: [
          ...state.lines,
          {
            lineId: crypto.randomUUID(),
            menuId: menu.id,
            name: menu.name,
            price: menu.price,
            quantity: 1,
            imageUrl: menu.imageUrl,
            selectedOptionIds: [],
            modifiers: [],
          },
        ],
      };
    }),
  increment: (lineId) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.lineId === lineId ? { ...l, quantity: l.quantity + 1 } : l,
      ),
    })),
  decrement: (lineId) =>
    set((state) => ({
      lines: state.lines
        .map((l) =>
          l.lineId === lineId ? { ...l, quantity: l.quantity - 1 } : l,
        )
        .filter((l) => l.quantity > 0),
    })),
  setNote: (lineId, note) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.lineId === lineId ? { ...l, note } : l,
      ),
    })),
  removeItem: (lineId) =>
    set((state) => ({
      lines: state.lines.filter((l) => l.lineId !== lineId),
    })),
  clear: () => set({ lines: [] }),
}));

// selectors (เลี่ยงคำนวณซ้ำใน component)
export const selectTotalQuantity = (state: CartState): number =>
  state.lines.reduce((sum, l) => sum + l.quantity, 0);

export const selectTotalPrice = (state: CartState): number =>
  state.lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
