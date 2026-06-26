import { useCartStore, selectTotalPrice } from '../store/cartStore';
import { formatBaht } from '../utils/money';
import { MenuThumb } from './MenuThumb';

interface CartDrawerProps {
  open: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function CartDrawer({ open, submitting, onClose, onSubmit }: CartDrawerProps) {
  const lines = useCartStore((s) => s.lines);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const setNote = useCartStore((s) => s.setNote);
  const total = useCartStore(selectTotalPrice);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mx-auto max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-warm p-5">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">🛒 ตะกร้าของคุณ</h2>
          <button type="button" onClick={onClose} className="text-sm font-medium text-slate-400">
            ปิด
          </button>
        </div>

        {lines.length === 0 ? (
          <p className="py-8 text-center text-slate-400">ตะกร้าว่าง</p>
        ) : (
          <ul className="space-y-3">
            {lines.map((line) => (
              <li
                key={line.menuId}
                className="rounded-xl bg-white p-3 ring-1 ring-slate-100"
              >
                <div className="flex items-center justify-between gap-3">
                  <MenuThumb
                    imageUrl={line.imageUrl}
                    alt={line.name}
                    className="h-12 w-12"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{line.name}</p>
                    <p className="text-sm font-semibold text-orange-600">{formatBaht(line.price)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => decrement(line.menuId)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 active:scale-90"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-semibold">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => increment(line.menuId)}
                      className="grid h-8 w-8 place-items-center rounded-full bg-linear-to-br from-orange-500 to-rose-500 text-lg font-bold text-white shadow-sm shadow-orange-500/30 active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={line.note ?? ''}
                  onChange={(e) => setNote(line.menuId, e.target.value)}
                  maxLength={200}
                  placeholder="หมายเหตุ เช่น ไม่เผ็ด / พิเศษ (ถ้ามี)"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          disabled={lines.length === 0 || submitting}
          onClick={onSubmit}
          className="mt-5 w-full rounded-xl bg-linear-to-r from-orange-500 to-rose-500 py-4 font-bold text-white shadow-lg shadow-orange-500/30 active:scale-[0.99] disabled:opacity-50 disabled:shadow-none"
        >
          {submitting ? 'กำลังส่ง...' : `ยืนยันสั่ง · ${formatBaht(total)}`}
        </button>
      </div>
    </div>
  );
}
