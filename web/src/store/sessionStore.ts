import { create } from 'zustand';
import type { OrderItem, Session } from '../type/domain';
import type { SessionStatus } from '../type/api';

interface SessionState {
  tableId: number | null;
  token: string | null;
  status: SessionStatus;
  session: Session | null;
  init: (tableId: number, token: string) => void;
  setStatus: (status: SessionStatus) => void;
  setSession: (session: Session) => void;
  // real-time: รวม OrderItem ที่เพิ่งสั่ง (กันซ้ำด้วย id)
  applyOrderCreated: (items: OrderItem[]) => void;
  // real-time: อัปเดตสถานะรายการเดียว
  applyItemStatus: (item: OrderItem) => void;
  markClosed: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  tableId: null,
  token: null,
  status: 'loading',
  session: null,
  init: (tableId, token) => set({ tableId, token, status: 'loading' }),
  setStatus: (status) => set({ status }),
  setSession: (session) => set({ session, status: 'ready' }),
  applyOrderCreated: (items) =>
    set((state) => {
      if (!state.session) return state;
      const existingIds = new Set(state.session.orderItems.map((i) => i.id));
      const merged = [
        ...state.session.orderItems,
        ...items.filter((i) => !existingIds.has(i.id)),
      ];
      return { session: { ...state.session, orderItems: merged } };
    }),
  applyItemStatus: (item) =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          orderItems: state.session.orderItems.map((i) =>
            i.id === item.id ? item : i,
          ),
        },
      };
    }),
  markClosed: () => set({ status: 'closed' }),
}));
