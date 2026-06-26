import { useMemo, useState } from 'react';
import { formatBaht } from '../utils/money';
import type { CheckoutPayload } from '../type/staff';

interface CheckoutConfirmModalProps {
  tableNumber: string;
  subtotal: number; // สตางค์ ยอดก่อนหักส่วนลด
  busy: boolean;
  onConfirm: (payload: CheckoutPayload) => void;
  onCancel: () => void;
}

// แปลงข้อความบาท -> สตางค์ (ว่าง/ไม่ใช่ตัวเลข = 0)
function toSatang(baht: string): number {
  const n = parseFloat(baht);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

export function CheckoutConfirmModal({
  tableNumber,
  subtotal,
  busy,
  onConfirm,
  onCancel,
}: CheckoutConfirmModalProps) {
  const [discountInput, setDiscountInput] = useState('');
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash');
  const [receivedInput, setReceivedInput] = useState('');

  const discount = Math.min(toSatang(discountInput), subtotal);
  const total = subtotal - discount;
  const received = toSatang(receivedInput);
  const change = useMemo(
    () => (method === 'cash' && received > 0 ? received - total : null),
    [method, received, total],
  );

  function handleConfirm(): void {
    onConfirm({
      discount: discount > 0 ? discount : undefined,
      paymentMethod: method,
      receivedAmount: method === 'cash' && received > 0 ? received : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={busy ? undefined : onCancel}
      />
      <div className="relative w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-center text-lg font-bold">
          เช็คบิล โต๊ะ {tableNumber}
        </h2>

        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>ยอดรวม</span>
            <span>{formatBaht(subtotal)}</span>
          </div>
          <label className="flex items-center justify-between gap-2">
            <span className="text-slate-500">ส่วนลด</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder="0"
              className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right"
            />
          </label>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
            <span>สุทธิ</span>
            <span>{formatBaht(total)}</span>
          </div>
        </div>

        {/* วิธีชำระ */}
        <div className="mt-4 flex gap-2">
          {(['cash', 'transfer'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                method === m
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {m === 'cash' ? '💵 เงินสด' : '🏦 โอน'}
            </button>
          ))}
        </div>

        {/* รับเงิน + ทอน (เงินสด) */}
        {method === 'cash' && (
          <div className="mt-3 space-y-2 text-sm">
            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-500">รับเงิน</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={receivedInput}
                onChange={(e) => setReceivedInput(e.target.value)}
                placeholder="0"
                className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-right"
              />
            </label>
            {change !== null && (
              <div
                className={`flex justify-between font-semibold ${
                  change < 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                <span>{change < 0 ? 'เงินขาด' : 'เงินทอน'}</span>
                <span>{formatBaht(Math.abs(change))}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-lg bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'กำลังเช็คบิล...' : 'ยืนยัน & พิมพ์'}
          </button>
        </div>
      </div>
    </div>
  );
}
