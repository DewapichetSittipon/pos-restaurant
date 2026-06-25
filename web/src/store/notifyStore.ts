import { create } from 'zustand';

// นับจำนวนแจ้งเตือนที่ "ยังไม่เห็น" แยกตามหมวด เพื่อโชว์ badge บน NavBar
// แม้กำลังอยู่คนละหน้า — เคลียร์เมื่อ staff เปิดหน้านั้นจริง
interface NotifyState {
  serviceCount: number; // คำขอจากโต๊ะ (เรียกพนักงาน/เช็คบิล) -> ผังโต๊ะ
  orderCount: number; // ออเดอร์ใหม่ -> ครัว
  bumpService: () => void;
  bumpOrder: () => void;
  clearService: () => void;
  clearOrder: () => void;
}

export const useNotifyStore = create<NotifyState>((set) => ({
  serviceCount: 0,
  orderCount: 0,
  bumpService: () => set((s) => ({ serviceCount: s.serviceCount + 1 })),
  bumpOrder: () => set((s) => ({ orderCount: s.orderCount + 1 })),
  clearService: () => set({ serviceCount: 0 }),
  clearOrder: () => set({ orderCount: 0 }),
}));
