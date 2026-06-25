import { create } from 'zustand';
import type { CartLine, MenuItem } from '../type/domain';

interface CartState {
  lines: CartLine[];
  addItem: (menu: MenuItem) => void;
  increment: (menuId: number) => void;
  decrement: (menuId: number) => void;
  removeItem: (menuId: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  lines: [],
  addItem: (menu) =>
    set((state) => {
      const existing = state.lines.find((l) => l.menuId === menu.id);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.menuId === menu.id ? { ...l, quantity: l.quantity + 1 } : l,
          ),
        };
      }
      return {
        lines: [
          ...state.lines,
          {
            menuId: menu.id,
            name: menu.name,
            price: menu.price,
            quantity: 1,
            imageUrl: menu.imageUrl,
          },
        ],
      };
    }),
  increment: (menuId) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.menuId === menuId ? { ...l, quantity: l.quantity + 1 } : l,
      ),
    })),
  decrement: (menuId) =>
    set((state) => ({
      lines: state.lines
        .map((l) =>
          l.menuId === menuId ? { ...l, quantity: l.quantity - 1 } : l,
        )
        .filter((l) => l.quantity > 0),
    })),
  removeItem: (menuId) =>
    set((state) => ({
      lines: state.lines.filter((l) => l.menuId !== menuId),
    })),
  clear: () => set({ lines: [] }),
}));

// selectors (เลี่ยงคำนวณซ้ำใน component)
export const selectTotalQuantity = (state: CartState): number =>
  state.lines.reduce((sum, l) => sum + l.quantity, 0);

export const selectTotalPrice = (state: CartState): number =>
  state.lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
