import type { OrderItemStatus } from '../type/domain';

interface StatusBadgeProps {
  status: OrderItemStatus;
}

const LABELS: Record<OrderItemStatus, string> = {
  queued: 'รอคิว',
  cooking: 'กำลังทำ',
  served: 'เสิร์ฟแล้ว',
  voided: 'ยกเลิก',
};

const STYLES: Record<OrderItemStatus, string> = {
  queued: 'bg-slate-200 text-slate-700',
  cooking: 'bg-amber-200 text-amber-800',
  served: 'bg-emerald-200 text-emerald-800',
  voided: 'bg-rose-200 text-rose-800 line-through',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
