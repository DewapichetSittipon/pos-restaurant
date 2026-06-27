import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchActiveQueue,
  updateOrderStatus,
  voidOrder,
} from '../services/staffApi';
import { useStaffSocket } from '../hooks/useStaffSocket';
import { useToastStore } from '../store/toastStore';
import { SOCKET_EVENTS } from '../services/socket';
import type { ActiveOrderItem } from '../type/staff';
import { StatusBadge } from '../components/StatusBadge';
import { formatTime } from '../utils/datetime';

interface Ticket {
  batchId: string;
  tableNumber: string;
  items: ActiveOrderItem[];
}

function toTickets(items: ActiveOrderItem[]): Ticket[] {
  const order: string[] = [];
  const map = new Map<string, Ticket>();
  for (const item of items) {
    if (!map.has(item.batchId)) {
      map.set(item.batchId, {
        batchId: item.batchId,
        tableNumber: item.bill.table.tableNumber,
        items: [],
      });
      order.push(item.batchId);
    }
    map.get(item.batchId)!.items.push(item);
  }
  return order.map((id) => map.get(id)!);
}

export function KitchenPage() {
  const [items, setItems] = useState<ActiveOrderItem[]>([]);
  const push = useToastStore((s) => s.push);

  const reload = useCallback(() => {
    fetchActiveQueue()
      .then(setItems)
      .catch(() => push('โหลดคิวครัวไม่สำเร็จ', 'error'));
  }, [push]);

  useEffect(() => {
    reload();
  }, [reload]);

  // เสียง/แจ้งเตือนจัดการที่ StaffLayout (ทำงานทุกหน้า) — ที่นี่แค่รีโหลดข้อมูล
  useStaffSocket({
    [SOCKET_EVENTS.orderCreated]: () => reload(),
    [SOCKET_EVENTS.orderItemStatusChanged]: () => reload(),
  });

  const tickets = useMemo(() => toTickets(items), [items]);

  async function advance(
    item: ActiveOrderItem,
  ): Promise<void> {
    const next = item.status === 'queued' ? 'cooking' : 'served';
    try {
      await updateOrderStatus(item.id, next);
      reload();
    } catch {
      push('เปลี่ยนสถานะไม่สำเร็จ', 'error');
    }
  }

  // ยกเลิกรายการ พร้อมถามเหตุผล (คืนสต็อกเฉพาะที่ยังไม่เริ่มทำ — ฝั่ง backend จัดการ)
  async function handleVoid(item: ActiveOrderItem): Promise<void> {
    const reason = window.prompt(
      `ยกเลิก "${item.itemName}" ×${item.quantity}?\nระบุเหตุผล (ไม่บังคับ):`,
    );
    if (reason === null) return; // กดยกเลิก prompt
    try {
      await voidOrder(item.id, reason || undefined);
      push('ยกเลิกรายการแล้ว', 'success');
      reload();
    } catch {
      push('ยกเลิกไม่สำเร็จ', 'error');
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">จอครัว</h1>
      {tickets.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-slate-400">
          ไม่มีรายการค้างทำ
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <div key={ticket.batchId} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-3 flex items-center justify-between">
                <span className="text-lg font-bold">โต๊ะ {ticket.tableNumber}</span>
                <span className="text-xs font-medium text-slate-400">
                  สั่ง {formatTime(ticket.items[0].createdAt)}
                </span>
              </p>
              <ul className="space-y-2">
                {ticket.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="min-w-0">
                      <span className="truncate">{item.itemName}</span>{' '}
                      <span className="text-slate-400">×{item.quantity}</span>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <span className="mt-0.5 block text-xs font-medium text-orange-700">
                          + {item.modifiers.map((m) => m.name).join(', ')}
                        </span>
                      )}
                      {item.note && (
                        <span className="mt-0.5 block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                          📝 {item.note}
                        </span>
                      )}
                      {item.servedAt && (
                        <span className="block text-xs text-emerald-600">
                          เสิร์ฟ {formatTime(item.servedAt)}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={item.status} />
                      {item.status === 'served' ? (
                        <span className="text-lg text-emerald-600">✓</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleVoid(item)}
                            className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-rose-600"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={() => advance(item)}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            {item.status === 'queued' ? 'เริ่มทำ' : 'เสิร์ฟแล้ว'}
                          </button>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
