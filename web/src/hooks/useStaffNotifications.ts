import { useStaffSocket } from './useStaffSocket';
import { useToastStore } from '../store/toastStore';
import { useNotifyStore } from '../store/notifyStore';
import { useStaffStore } from '../store/staffStore';
import { SOCKET_EVENTS } from '../services/socket';
import { alarmService, alarmOrder } from '../utils/sound';

// ฟังแจ้งเตือนระดับทั้งแอป (mount ที่ StaffLayout) — ทำงานทุกหน้า
// เล่นเสียง + เด้ง toast + เพิ่ม badge บน NavBar ให้รู้ว่าหมวดไหนมีของใหม่
// กรองตามบทบาท: WAITER สนใจคำขอจากโต๊ะ, KITCHEN สนใจออเดอร์, OWNER เห็นทั้งคู่
export function useStaffNotifications(): void {
  const push = useToastStore((s) => s.push);
  const bumpService = useNotifyStore((s) => s.bumpService);
  const bumpOrder = useNotifyStore((s) => s.bumpOrder);
  const role = useStaffStore((s) => s.staff?.role);

  const wantsService = role === 'OWNER' || role === 'WAITER';
  const wantsOrder = role === 'OWNER' || role === 'KITCHEN';

  useStaffSocket({
    [SOCKET_EVENTS.serviceRequestCreated]: () => {
      if (!wantsService) return;
      alarmService();
      bumpService();
      push('🔔 มีคำขอใหม่จากโต๊ะ', 'error');
    },
    [SOCKET_EVENTS.orderCreated]: () => {
      if (!wantsOrder) return;
      alarmOrder();
      bumpOrder();
      push('🍽️ มีออเดอร์ใหม่', 'info');
    },
  });
}
