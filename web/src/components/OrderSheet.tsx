import type { OrderItem, ServiceRequestType } from '../type/domain';
import { OrderHistory } from './OrderHistory';
import { ServiceButtons } from './ServiceButtons';

interface OrderSheetProps {
  open: boolean;
  items: OrderItem[];
  onClose: () => void;
  onRequest: (type: ServiceRequestType) => void;
}

export function OrderSheet({ open, items, onClose, onRequest }: OrderSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mx-auto max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-warm p-5">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">🧾 รายการที่สั่ง</h2>
          <button type="button" onClick={onClose} className="text-sm font-medium text-slate-400">
            ปิด
          </button>
        </div>

        <OrderHistory items={items} />

        <div className="mt-6 border-t border-slate-200 pt-5">
          <p className="mb-3 text-sm font-semibold text-slate-500">ต้องการความช่วยเหลือ?</p>
          <ServiceButtons onRequest={onRequest} disabled={false} />
        </div>
      </div>
    </div>
  );
}
