import type { OrderItem } from '../type/domain';
import { formatBaht } from '../utils/money';
import { formatTime } from '../utils/datetime';
import { groupByBatch } from '../utils/menu';
import { StatusBadge } from './StatusBadge';
import { MenuThumb } from './MenuThumb';

interface OrderHistoryProps {
  items: OrderItem[];
}

export function OrderHistory({ items }: OrderHistoryProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl bg-white p-4 text-center text-sm text-slate-400">
        ยังไม่มีรายการที่สั่ง
      </p>
    );
  }

  const batches = groupByBatch(items);

  return (
    <div className="space-y-4">
      {batches.map((batch, idx) => (
        <div key={batch[0].batchId} className="rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>รอบที่ {idx + 1}</span>
            <span>สั่ง {formatTime(batch[0].createdAt)}</span>
          </p>
          <ul className="space-y-2">
            {batch.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <MenuThumb
                  imageUrl={item.imageUrl}
                  alt={item.itemName}
                  className="h-10 w-10"
                />
                <span className="min-w-0 flex-1">
                  <span className="truncate">{item.itemName}</span>{' '}
                  <span className="text-slate-400">×{item.quantity}</span>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <span className="block text-xs font-medium text-orange-600">
                      + {item.modifiers.map((m) => m.name).join(', ')}
                    </span>
                  )}
                  {item.note && (
                    <span className="block text-xs font-medium text-amber-600">
                      📝 {item.note}
                    </span>
                  )}
                  {item.servedAt && (
                    <span className="block text-xs text-emerald-600">
                      เสิร์ฟ {formatTime(item.servedAt)}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={item.status} />
                  <span className="text-sm text-slate-500">
                    {formatBaht(item.unitPrice * item.quantity)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
