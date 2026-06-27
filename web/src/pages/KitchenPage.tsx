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
import { VoidItemModal } from '../components/VoidItemModal';
import { formatTime } from '../utils/datetime';
import { formatComboItems } from '../utils/menu';

interface Ticket {
  batchId: string;
  tableNumber: string;
  createdAt: string;
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
        createdAt: item.createdAt,
        items: [],
      });
      order.push(item.batchId);
    }
    map.get(item.batchId)!.items.push(item);
  }
  return order.map((id) => map.get(id)!);
}

// นาทีที่ผ่านไปตั้งแต่สั่ง (ใช้ now ที่ ticking เพื่อให้ตัวเลขเดินเอง)
function minutesSince(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

type Urgency = 'normal' | 'warn' | 'urgent';

function urgencyOf(min: number): Urgency {
  if (min >= 15) return 'urgent';
  if (min >= 8) return 'warn';
  return 'normal';
}

// สีกรอบ/หัวการ์ดตามเวลาที่ค้าง — มองแวบเดียวรู้ว่าใบไหนต้องรีบ
const CARD_STYLE: Record<Urgency, string> = {
  normal: 'border-slate-200',
  warn: 'border-amber-400',
  urgent: 'border-rose-500 ring-2 ring-rose-200',
};

const ELAPSED_STYLE: Record<Urgency, string> = {
  normal: 'bg-slate-100 text-slate-500',
  warn: 'bg-amber-100 text-amber-700',
  urgent: 'bg-rose-100 text-rose-700',
};

export function KitchenPage() {
  const [items, setItems] = useState<ActiveOrderItem[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [voidTarget, setVoidTarget] = useState<ActiveOrderItem | null>(null);
  const push = useToastStore((s) => s.push);

  const reload = useCallback(() => {
    fetchActiveQueue()
      .then(setItems)
      .catch(() => push('โหลดคิวครัวไม่สำเร็จ', 'error'));
  }, [push]);

  useEffect(() => {
    reload();
  }, [reload]);

  // เดินนาฬิกาทุก 20 วิ ให้ตัวเลข "รอ X นาที" และสีความเร่งด่วนอัปเดตเอง
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 20000);
    return () => window.clearInterval(id);
  }, []);

  // เสียง/แจ้งเตือนจัดการที่ StaffLayout (ทำงานทุกหน้า) — ที่นี่แค่รีโหลดข้อมูล
  useStaffSocket({
    [SOCKET_EVENTS.orderCreated]: () => reload(),
    [SOCKET_EVENTS.orderItemStatusChanged]: () => reload(),
  });

  const tickets = useMemo(() => toTickets(items), [items]);

  // ดันทั้งใบไปสเตจถัดไป: ถ้ายังมีของรอคิวให้เริ่มทำทั้งหมดก่อน แล้วค่อยรอบเสิร์ฟ
  async function advanceTicket(ticket: Ticket): Promise<void> {
    const pending = ticket.items.filter(
      (i) => i.status === 'queued' || i.status === 'cooking',
    );
    const queued = pending.filter((i) => i.status === 'queued');
    const batch = queued.length > 0 ? queued : pending;
    const next = queued.length > 0 ? 'cooking' : 'served';
    try {
      await Promise.all(batch.map((i) => updateOrderStatus(i.id, next)));
      reload();
    } catch {
      push('เปลี่ยนสถานะไม่สำเร็จ', 'error');
    }
  }

  async function advance(item: ActiveOrderItem): Promise<void> {
    const next = item.status === 'queued' ? 'cooking' : 'served';
    try {
      await updateOrderStatus(item.id, next);
      reload();
    } catch {
      push('เปลี่ยนสถานะไม่สำเร็จ', 'error');
    }
  }

  // ยกเลิกรายการ (คืนสต็อกเฉพาะที่ยังไม่เริ่มทำ — ฝั่ง backend จัดการ)
  async function confirmVoid(reason?: string): Promise<void> {
    if (!voidTarget) return;
    try {
      await voidOrder(voidTarget.id, reason);
      push('ยกเลิกรายการแล้ว', 'success');
      setVoidTarget(null);
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
          {tickets.map((ticket) => {
            const waited = minutesSince(ticket.createdAt, now);
            const urgency = urgencyOf(waited);
            const pending = ticket.items.filter(
              (i) => i.status === 'queued' || i.status === 'cooking',
            );
            const queuedCount = pending.filter((i) => i.status === 'queued').length;
            const bulkLabel =
              queuedCount > 0
                ? `เริ่มทำทั้งโต๊ะ (${queuedCount})`
                : `เสิร์ฟทั้งโต๊ะ (${pending.length})`;

            return (
              <div
                key={ticket.batchId}
                className={`flex flex-col rounded-2xl border-2 bg-white p-4 shadow-sm ${CARD_STYLE[urgency]}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xl font-bold">โต๊ะ {ticket.tableNumber}</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ELAPSED_STYLE[urgency]}`}
                  >
                    {waited === 0 ? 'เพิ่งสั่ง' : `รอ ${waited} นาที`}
                  </span>
                </div>
                <p className="mb-2 text-xs font-medium text-slate-400">
                  สั่ง {formatTime(ticket.createdAt)}
                </p>

                <ul className="flex-1 space-y-2">
                  {ticket.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-2 border-t border-slate-100 pt-2 first:border-t-0 first:pt-0"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="text-base font-medium">{item.itemName}</span>{' '}
                        <span className="font-bold text-slate-500">×{item.quantity}</span>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <span className="mt-0.5 block text-xs font-medium text-orange-700">
                            + {item.modifiers.map((m) => m.name).join(', ')}
                          </span>
                        )}
                        {item.comboItems && item.comboItems.length > 0 && (
                          <span className="mt-0.5 block rounded bg-violet-100 px-1.5 py-0.5 text-xs font-semibold text-violet-800">
                            🍱 {formatComboItems(item.comboItems)}
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
                      <span className="flex shrink-0 items-center gap-1.5">
                        <StatusBadge status={item.status} />
                        {item.status === 'served' ? (
                          <span className="text-xl text-emerald-600">✓</span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setVoidTarget(item)}
                              aria-label="ยกเลิกรายการนี้"
                              className="rounded-lg bg-slate-100 px-3 py-2 text-base font-semibold text-rose-600"
                            >
                              ✕
                            </button>
                            <button
                              type="button"
                              onClick={() => advance(item)}
                              aria-label={item.status === 'queued' ? 'เริ่มทำรายการนี้' : 'เสิร์ฟรายการนี้'}
                              className="rounded-lg bg-indigo-100 px-3 py-2 text-base font-semibold text-indigo-700"
                            >
                              ✓
                            </button>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {pending.length > 0 && (
                  <button
                    type="button"
                    onClick={() => advanceTicket(ticket)}
                    className="mt-4 w-full rounded-xl bg-indigo-600 py-3.5 text-base font-bold text-white active:bg-indigo-700"
                  >
                    {bulkLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {voidTarget && (
        <VoidItemModal
          itemName={voidTarget.itemName}
          quantity={voidTarget.quantity}
          onConfirm={confirmVoid}
          onClose={() => setVoidTarget(null)}
        />
      )}
    </div>
  );
}
