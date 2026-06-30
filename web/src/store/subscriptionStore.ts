import { create } from 'zustand';
import { fetchSubscription } from '../services/manageApi';

// ฟีเจอร์ของแพ็กเกจร้าน — โหลดครั้งเดียวตอน NavBar mount, ใช้ gate UI ทั้งแอป
// key ตรงกับ backend common/plan-access.ts
interface SubscriptionState {
  features: string[];
  loaded: boolean;
  load: () => Promise<void>;
  hasFeature: (key: string) => boolean;
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  features: [],
  loaded: false,
  load: async () => {
    try {
      const data = await fetchSubscription();
      set({ features: data.plan?.features ?? [], loaded: true });
    } catch {
      // เงียบ — บาง role (KITCHEN) เรียก endpoint นี้ไม่ได้ ไม่ควร block UI
    }
  },
  // ก่อนโหลดเสร็จคืน true (แสดงไว้ก่อน) เพื่อกัน UI กระพริบสำหรับร้านที่มีฟีเจอร์
  hasFeature: (key) => {
    const { loaded, features } = get();
    return !loaded || features.includes(key);
  },
  reset: () => set({ features: [], loaded: false }),
}));
