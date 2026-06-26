import { useEffect, useState } from 'react';
import {
  fetchBillDetail,
  fetchBillReceipt,
  refundBill,
} from '../services/staffApi';
import { useToastStore } from '../store/toastStore';
import { formatBaht } from '../utils/money';
import { printReceipt } from '../utils/printReceipt';
import type { BillDetail } from '../type/staff';

interface BillDetailModalProps {
  billId: number;
  onClose: () => void;
  onRefunded?: () => void; // ให้ผู้เรียกรีโหลดรายการหลังคืนเงิน
}

// Modal แสดงรายการเมนูของบิลย้อนหลัง จัดกลุ่มตามหมวด
export function BillDetailModal({
  billId,
  onClose,
  onRefunded,
}: BillDetailModalProps) {
  const [detail, setDetail] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reprinting, setReprinting] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [restoreStock, setRestoreStock] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const push = useToastStore((s) => s.push);

  async function handleReprint(): Promise<void> {
    setReprinting(true);
    try {
      await printReceipt(await fetchBillReceipt(billId));
    } catch {
      push('พิมพ์ใบเสร็จไม่สำเร็จ', 'error');
    } finally {
      setReprinting(false);
    }
  }

  async function handleRefund(): Promise<void> {
    if (!refundReason.trim()) {
      push('กรุณากรอกเหตุผลการคืนเงิน', 'error');
      return;
    }
    setRefunding(true);
    try {
      await refundBill(billId, refundReason.trim(), restoreStock);
      push('คืนเงินบิลแล้ว', 'success');
      onRefunded?.();
      setDetail((d) => (d ? { ...d, status: 'refunded' } : d));
      setShowRefund(false);
    } catch {
      push('คืนเงินไม่สำเร็จ', 'error');
    } finally {
      setRefunding(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchBillDetail(billId)
      .then(setDetail)
      .catch(() => push('โหลดรายละเอียดบิลไม่สำเร็จ', 'error'))
      .finally(() => setLoading(false));
  }, [billId, push]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">บิล #{billId}</h2>
            {detail && (
              <p className="text-sm text-slate-500">
                โต๊ะ {detail.tableNumber} ·{' '}
                {new Date(detail.paidAt).toLocaleString('th-TH', {
                  timeZone: 'Asia/Bangkok',
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
            aria-label="ปิด"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="py-8 text-center text-slate-400">กำลังโหลด...</p>
          ) : detail && detail.categories.length > 0 ? (
            <div className="space-y-5">
              {detail.categories.map((cat) => (
                <div key={cat.categoryId}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">
                      {cat.categoryName}
                    </h3>
                    <span className="text-xs text-slate-400">
                      {formatBaht(cat.subtotalSatang)}
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {cat.items.map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center justify-between py-2 text-sm"
                      >
                        <span className="flex-1">
                          <span className="font-medium text-slate-800">
                            {it.itemName}
                          </span>
                          <span className="ml-2 text-slate-400">
                            ×{it.quantity}
                          </span>
                        </span>
                        <span className="font-medium text-slate-700">
                          {formatBaht(it.lineSatang)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-slate-400">ไม่มีรายการในบิลนี้</p>
          )}
        </div>

        {detail && (
          <div className="border-t border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">ยอดรวม</span>
              <span
                className={`text-xl font-bold ${
                  detail.status === 'refunded'
                    ? 'text-slate-400 line-through'
                    : 'text-emerald-600'
                }`}
              >
                {formatBaht(detail.totalSatang)}
              </span>
            </div>

            {detail.status === 'refunded' && (
              <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <span className="font-semibold">คืนเงินแล้ว</span>
                {detail.refundReason && <> · {detail.refundReason}</>}
                {detail.refundedByName && (
                  <span className="text-rose-400"> (โดย {detail.refundedByName})</span>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleReprint}
              disabled={reprinting}
              className="mt-3 w-full rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {reprinting ? 'กำลังพิมพ์...' : '🖨️ พิมพ์ใบเสร็จซ้ำ'}
            </button>

            {detail.status === 'paid' && !showRefund && (
              <button
                type="button"
                onClick={() => setShowRefund(true)}
                className="mt-2 w-full rounded-lg border border-rose-200 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
              >
                ↩️ คืนเงินบิลนี้
              </button>
            )}

            {detail.status === 'paid' && showRefund && (
              <div className="mt-3 space-y-2 rounded-lg bg-rose-50 p-3">
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={2}
                  placeholder="เหตุผลการคืนเงิน (จำเป็น)"
                  className="w-full resize-none rounded-lg border border-rose-200 px-3 py-2 text-sm"
                />
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={restoreStock}
                    onChange={(e) => setRestoreStock(e.target.checked)}
                    className="h-4 w-4"
                  />
                  คืนสต็อกสินค้า (กรณีสั่งผิด/ยังไม่ได้ทำ)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRefund(false)}
                    disabled={refunding}
                    className="flex-1 rounded-lg bg-white py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleRefund}
                    disabled={refunding}
                    className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {refunding ? 'กำลังคืนเงิน...' : 'ยืนยันคืนเงิน'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
