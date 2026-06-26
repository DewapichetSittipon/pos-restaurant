import { formatBaht } from '../utils/money';

interface CheckoutConfirmModalProps {
  tableNumber: string;
  total: number; // สตางค์
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CheckoutConfirmModal({
  tableNumber,
  total,
  busy,
  onConfirm,
  onCancel,
}: CheckoutConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={busy ? undefined : onCancel}
      />
      <div className="relative w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-2xl">
          🧾
        </div>
        <h2 className="text-lg font-bold">ยืนยันเช็คบิล</h2>
        <p className="mt-1 text-sm text-slate-500">
          ปิดบิลโต๊ะ {tableNumber} และพิมพ์ใบเสร็จ
        </p>

        <div className="my-4 rounded-xl bg-slate-50 py-3">
          <p className="text-xs text-slate-500">ยอดรวม</p>
          <p className="text-2xl font-bold text-slate-900">{formatBaht(total)}</p>
        </div>

        <div className="flex gap-2">
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
            onClick={onConfirm}
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
