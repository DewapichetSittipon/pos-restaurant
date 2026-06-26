import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCatalog } from '../services/manageApi';
import {
  addStaffOrder,
  fetchTableBill,
  mergeBill,
  splitBill,
  transferBill,
} from '../services/staffApi';
import { useToastStore } from '../store/toastStore';
import { formatBaht } from '../utils/money';
import type { Category } from '../type/domain';
import type { TableBill } from '../type/staff';
import { OrderHistory } from './OrderHistory';

interface TableBillModalProps {
  tableId: number;
  tableNumber: string;
  vacantTables: { id: number; tableNumber: string }[];
  occupiedTables: { id: number; tableNumber: string }[];
  onClose: () => void;
  onTransferred: () => void;
  onMerged: () => void;
  onSplit: () => void;
}

export function TableBillModal({
  tableId,
  tableNumber,
  vacantTables,
  occupiedTables,
  onClose,
  onTransferred,
  onMerged,
  onSplit,
}: TableBillModalProps) {
  const push = useToastStore((s) => s.push);
  const [bill, setBill] = useState<TableBill | null>(null);
  const [loadingBill, setLoadingBill] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [showMerge, setShowMerge] = useState(false);
  const [merging, setMerging] = useState(false);
  const [showSplit, setShowSplit] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [splitIds, setSplitIds] = useState<Set<number>>(new Set());

  // รายการที่แยกได้ (ไม่นับที่ยกเลิก)
  const splittable = useMemo(
    () => (bill?.orderItems ?? []).filter((i) => i.status !== 'voided'),
    [bill],
  );

  function toggleSplitId(id: number): void {
    setSplitIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSplit(toTableId: number): Promise<void> {
    if (splitIds.size === 0) {
      push('เลือกรายการที่จะแยกก่อน', 'error');
      return;
    }
    setSplitting(true);
    try {
      await splitBill(tableId, toTableId, [...splitIds]);
      push('แยกบิลแล้ว', 'success');
      onSplit();
    } catch {
      push('แยกบิลไม่สำเร็จ (เหลืออย่างน้อย 1 รายการที่โต๊ะเดิม)', 'error');
      setSplitting(false);
    }
  }

  async function handleTransfer(toTableId: number): Promise<void> {
    setTransferring(true);
    try {
      await transferBill(tableId, toTableId);
      push('ย้ายโต๊ะแล้ว', 'success');
      onTransferred();
    } catch {
      push('ย้ายโต๊ะไม่สำเร็จ', 'error');
      setTransferring(false);
    }
  }

  // รวมบิลโต๊ะอื่นเข้ากับโต๊ะนี้ (โต๊ะนี้เป็นปลายทางที่เก็บไว้)
  async function handleMerge(fromTableId: number): Promise<void> {
    setMerging(true);
    try {
      await mergeBill(tableId, fromTableId);
      push('รวมบิลแล้ว', 'success');
      onMerged();
    } catch {
      push('รวมบิลไม่สำเร็จ', 'error');
      setMerging(false);
    }
  }

  const loadBill = useCallback(() => {
    return fetchTableBill(tableId)
      .then(setBill)
      .catch(() => setError('โหลดบิลไม่สำเร็จ'))
      .finally(() => setLoadingBill(false));
  }, [tableId]);

  useEffect(() => {
    loadBill();
    fetchCatalog()
      .then(setCategories)
      .catch(() => setError('โหลดเมนูไม่สำเร็จ'));
  }, [loadBill]);

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

  async function handleAdd(): Promise<void> {
    const items = Object.entries(qty)
      .filter(([, n]) => n > 0)
      .map(([menuId, n]) => ({
        menuId: Number(menuId),
        quantity: n,
        note: notes[Number(menuId)]?.trim() || undefined,
      }));
    if (items.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await addStaffOrder(tableId, items);
      push(`เพิ่ม ${totalQty} รายการแล้ว`, 'success');
      setQty({});
      setNotes({});
      await loadBill(); // รีเฟรชรายการ "สั่งแล้ว" ให้เห็นทันที (modal ยังเปิดอยู่)
    } catch {
      setError('เพิ่มรายการไม่สำเร็จ (เมนูอาจหมด/งดขาย)');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-bold">บิลโต๊ะ {tableNumber}</h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setShowMerge((v) => !v);
                setShowTransfer(false);
                setShowSplit(false);
              }}
              className="text-sm font-medium text-indigo-600"
            >
              รวมบิล
            </button>
            <button
              type="button"
              onClick={() => {
                setShowSplit((v) => !v);
                setShowMerge(false);
                setShowTransfer(false);
              }}
              className="text-sm font-medium text-indigo-600"
            >
              แยกบิล
            </button>
            <button
              type="button"
              onClick={() => {
                setShowTransfer((v) => !v);
                setShowMerge(false);
                setShowSplit(false);
              }}
              className="text-sm font-medium text-indigo-600"
            >
              ย้ายโต๊ะ
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        </header>

        {/* รวมบิลจากโต๊ะอื่น (โต๊ะที่มีลูกค้า) เข้าโต๊ะนี้ */}
        {showMerge && (
          <div className="border-b border-slate-200 bg-amber-50 px-5 py-3">
            <p className="mb-2 text-sm font-medium text-slate-600">
              รวมบิลจากโต๊ะ (ย้ายรายการมารวมที่โต๊ะ {tableNumber}):
            </p>
            {occupiedTables.length === 0 ? (
              <p className="text-sm text-slate-400">ไม่มีโต๊ะอื่นที่มีลูกค้า</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {occupiedTables.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleMerge(t.id)}
                    disabled={merging}
                    className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 disabled:opacity-50"
                  >
                    โต๊ะ {t.tableNumber}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ตัวเลือกย้ายไปโต๊ะว่าง */}
        {showTransfer && (
          <div className="border-b border-slate-200 bg-indigo-50 px-5 py-3">
            <p className="mb-2 text-sm font-medium text-slate-600">
              ย้ายไปโต๊ะว่าง:
            </p>
            {vacantTables.length === 0 ? (
              <p className="text-sm text-slate-400">ไม่มีโต๊ะว่าง</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {vacantTables.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTransfer(t.id)}
                    disabled={transferring}
                    className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 disabled:opacity-50"
                  >
                    โต๊ะ {t.tableNumber}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* แยกบิล: เลือกรายการ → ส่งไปโต๊ะว่าง เปิดเป็นบิลใหม่ */}
        {showSplit && (
          <div className="border-b border-slate-200 bg-emerald-50 px-5 py-3">
            <p className="mb-2 text-sm font-medium text-slate-600">
              เลือกรายการที่จะแยกออกไปบิลใหม่:
            </p>
            {splittable.length === 0 ? (
              <p className="text-sm text-slate-400">ยังไม่มีรายการ</p>
            ) : (
              <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto">
                {splittable.map((it) => (
                  <li key={it.id}>
                    <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={splitIds.has(it.id)}
                        onChange={() => toggleSplitId(it.id)}
                        className="h-4 w-4"
                      />
                      <span className="flex-1 truncate">
                        {it.itemName}
                        <span className="ml-1 text-slate-400">×{it.quantity}</span>
                      </span>
                      <span className="text-slate-500">
                        {formatBaht(it.unitPrice * it.quantity)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <p className="mb-2 text-sm font-medium text-slate-600">
              แยกไปโต๊ะว่าง ({splitIds.size} รายการ):
            </p>
            {vacantTables.length === 0 ? (
              <p className="text-sm text-slate-400">ไม่มีโต๊ะว่าง</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {vacantTables.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSplit(t.id)}
                    disabled={splitting || splitIds.size === 0}
                    className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 disabled:opacity-50"
                  >
                    โต๊ะ {t.tableNumber}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50 px-5 py-4">
          {/* รายการที่สั่งไปแล้ว */}
          <section>
            <h4 className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-500">
              <span>สั่งไปแล้ว</span>
              {bill && (
                <span className="text-slate-700">
                  รวม {formatBaht(bill.totalPrice)}
                </span>
              )}
            </h4>
            {loadingBill ? (
              <p className="py-4 text-center text-sm text-slate-400">
                กำลังโหลด...
              </p>
            ) : (
              <OrderHistory items={bill?.orderItems ?? []} />
            )}
          </section>

          {/* เพิ่มรายการใหม่ */}
          <section>
            <h4 className="mb-2 text-sm font-semibold text-slate-500">
              เพิ่มรายการ
            </h4>
            {categories.map((cat) => {
              const items = cat.menus.filter(
                (m) => !m.isArchived && m.isAvailable,
              );
              if (items.length === 0) return null;
              return (
                <div key={cat.id} className="mb-4">
                  <p className="mb-2 text-xs font-semibold text-slate-400">
                    {cat.name}
                  </p>
                  <ul className="space-y-2">
                    {items.map((m) => {
                      const n = qty[m.id] ?? 0;
                      const soldOut = m.stockCount === 0;
                      return (
                        <li
                          key={m.id}
                          className="rounded-lg bg-white px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-3">
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
                          </div>
                          {n > 0 && (
                            <input
                              type="text"
                              value={notes[m.id] ?? ''}
                              onChange={(e) =>
                                setNotes((s) => ({ ...s, [m.id]: e.target.value }))
                              }
                              maxLength={200}
                              placeholder="หมายเหตุ เช่น ไม่เผ็ด (ถ้ามี)"
                              className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm"
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </section>
        </div>

        <footer className="border-t border-slate-200 px-5 py-4">
          {error && <p className="mb-2 text-sm text-rose-600">{error}</p>}
          <button
            type="button"
            onClick={handleAdd}
            disabled={submitting || totalQty === 0}
            className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting
              ? 'กำลังเพิ่ม...'
              : totalQty === 0
                ? 'เลือกรายการเพื่อสั่งเพิ่ม'
                : `เพิ่ม ${totalQty} รายการ · ${formatBaht(totalSatang)}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
