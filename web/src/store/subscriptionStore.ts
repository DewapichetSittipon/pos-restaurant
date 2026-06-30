import { create } from 'zustand';
import { fetchSubscription } from '../services/manageApi';

// ฟีเจอร์ของแพ็กเกจร้าน — โหลดครั้งเดียวตอน NavBar mount, ใช้ gate UI ทั้งแอป
// key ตรงกับ backend common/plan-access.ts
interface SubscriptionState {
  features: string[];
  planKey: string | null; // 'free' (เริ่มต้น) | 'pro'
  planName: string | null; // ชื่อโชว์ เช่น "โปร"
  loaded: boolean;
  load: () => Promise<void>;
  hasFeature: (key: string) => boolean;
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  features: [],
  planKey: null,
  planName: null,
  loaded: false,
  load: async () => {
    try {
      const data = await fetchSubscription();
      set({
        features: data.plan?.features ?? [],
        planKey: data.plan?.key ?? null,
        planName: data.plan?.name ?? null,
        loaded: true,
      });
    } catch {
      // เงียบ — บาง role (KITCHEN) เรียก endpoint นี้ไม่ได้ ไม่ควร block UI
    }
  },
  // ก่อนโหลดเสร็จคืน true (แสดงไว้ก่อน) เพื่อกัน UI กระพริบสำหรับร้านที่มีฟีเจอร์
  hasFeature: (key) => {
    const { loaded, features } = get();
    return !loaded || features.includes(key);
  },
  reset: () => set({ features: [], planKey: null, planName: null, loaded: false }),
}));
