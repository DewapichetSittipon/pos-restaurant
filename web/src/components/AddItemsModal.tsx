import { useEffect, useMemo, useState } from 'react';
import { fetchCatalog } from '../services/manageApi';
import { addStaffOrder } from '../services/staffApi';
import { formatBaht } from '../utils/money';
import type { Category } from '../type/domain';

interface AddItemsModalProps {
  tableId: number;
  tableNumber: string;
  onClose: () => void;
  onAdded: (count: number) => void; // หลังเพิ่มสำเร็จ (count = จำนวนรายการ)
}

export function AddItemsModal({
  tableId,
  tableNumber,
  onClose,
  onAdded,
}: AddItemsModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCatalog()
      .then(setCategories)
      .catch(() => setError('โหลดเมนูไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  function bump(menuId: number, delta: number): void {
    setQty((q) => {
      const next = Math.max(0, (q[menuId] ?? 0) + delta);
      return { ...q, [menuId]: next };
    });
  }

  const { totalQty, totalSatang } = useMemo(() => {
    let count = 0;
    let satang = 0;
    for (const cat of categories) {
      for (const m of cat.menus) {
        const n = qty[m.id] ?? 0;
        count += n;
        satang += n * m.price;
      }
    }
    return { totalQty: count, totalSatang: satang };
  }, [qty, categories]);

  async function handleSubmit(): Promise<void> {
    const items = Object.entries(qty)
      .filter(([, n]) => n > 0)
      .map(([menuId, n]) => ({ menuId: Number(menuId), quantity: n }));
    if (items.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await addStaffOrder(tableId, items);
      onAdded(totalQty);
    } catch {
      setError('เพิ่มรายการไม่สำเร็จ (เมนูอาจหมด/งดขาย)');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-bold">เพิ่มรายการ · โต๊ะ {tableNumber}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">
              กำลังโหลดเมนู...
            </p>
          ) : (
            categories.map((cat) => {
              const items = cat.menus.filter(
                (m) => !m.isArchived && m.isAvailable,
              );
              if (items.length === 0) return null;
              return (
                <div key={cat.id} className="mb-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-500">
                    {cat.name}
                  </h4>
                  <ul className="space-y-2">
                    {items.map((m) => {
                      const n = qty[m.id] ?? 0;
                      const soldOut = m.stockCount === 0;
                      return (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {m.name}
                              {soldOut && (
                                <span className="ml-2 text-xs text-rose-500">
                                  หมด
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatBaht(m.price)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => bump(m.id, -1)}
                              disabled={n === 0}
                              className="h-8 w-8 rounded-full bg-slate-100 text-lg font-bold text-slate-600 disabled:opacity-40"
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">
                              {n}
                            </span>
                            <button
                              type="button"
                              onClick={() => bump(m.id, 1)}
                              disabled={soldOut}
                              className="h-8 w-8 rounded-full bg-indigo-600 text-lg font-bold text-white disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>

        <footer className="border-t border-slate-200 px-5 py-4">
          {error && <p className="mb-2 text-sm text-rose-600">{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || totalQty === 0}
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting
              ? 'กำลังเพิ่ม...'
              : totalQty === 0
                ? 'เลือกรายการ'
                : `เพิ่ม ${totalQty} รายการ · ${formatBaht(totalSatang)}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
