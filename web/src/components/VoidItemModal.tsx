import { useState } from 'react';

interface VoidItemModalProps {
  itemName: string;
  quantity: number;
  onConfirm: (reason?: string) => void;
  onClose: () => void;
}

// เหตุผลยอดฮิตให้กดเลือกเร็วๆ บนจอสัมผัส (ไม่ต้องพิมพ์)
const QUICK_REASONS = ['ลูกค้ายกเลิก', 'ของหมด', 'สั่งผิด', 'ทำผิดเมนู'];

export function VoidItemModal({
  itemName,
  quantity,
  onConfirm,
  onClose,
}: VoidItemModalProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">ยกเลิกรายการ</h2>
        <p className="mt-1 text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{itemName}</span> ×{quantity}
        </p>

        <p className="mt-4 mb-2 text-sm font-medium text-slate-600">เหตุผล (ไม่บังคับ)</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                reason === r
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="หรือพิมพ์เหตุผลอื่น…"
          rows={2}
          className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
        />

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-100 py-3 text-base font-semibold text-slate-700"
          >
            ไม่ใช่
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim() || undefined)}
            className="flex-1 rounded-xl bg-rose-600 py-3 text-base font-semibold text-white"
          >
            ยืนยันยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
