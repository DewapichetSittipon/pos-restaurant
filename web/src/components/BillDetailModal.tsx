import { useEffect, useState } from 'react';
import { fetchBillDetail } from '../services/staffApi';
import { useToastStore } from '../store/toastStore';
import { formatBaht } from '../utils/money';
import type { BillDetail } from '../type/staff';

interface BillDetailModalProps {
  billId: number;
  onClose: () => void;
}

// Modal แสดงรายการเมนูของบิลย้อนหลัง จัดกลุ่มตามหมวด
export function BillDetailModal({ billId, onClose }: BillDetailModalProps) {
  const [detail, setDetail] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const push = useToastStore((s) => s.push);

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
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
            <span className="text-sm font-semibold text-slate-500">ยอดรวม</span>
            <span className="text-xl font-bold text-emerald-600">
              {formatBaht(detail.totalSatang)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
