import type { ServiceRequestType } from '../type/domain';
import { useT } from '../i18n';

interface ServiceButtonsProps {
  onRequest: (type: ServiceRequestType) => void;
  disabled: boolean;
}

export function ServiceButtons({ onRequest, disabled }: ServiceButtonsProps) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onRequest('call_staff')}
        className="rounded-xl bg-amber-50 py-3 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 active:scale-95 disabled:opacity-50"
      >
        🔔 {t('callStaff')}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onRequest('call_bill')}
        className="rounded-xl bg-orange-50 py-3 text-sm font-semibold text-orange-700 ring-1 ring-orange-200 active:scale-95 disabled:opacity-50"
      >
        🧾 {t('callBill')}
      </button>
    </div>
  );
}
