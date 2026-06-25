import { useEffect, useState } from 'react';
import { fetchEod } from '../services/staffApi';
import { useToastStore } from '../store/toastStore';
import { formatBaht } from '../utils/money';
import { bangkokToday } from '../utils/datetime';
import type { EodReport } from '../type/staff';

export function EodReportPage() {
  const [date, setDate] = useState(bangkokToday());
  const [report, setReport] = useState<EodReport | null>(null);
  const [loading, setLoading] = useState(false);
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    setLoading(true);
    fetchEod(date)
      .then(setReport)
      .catch(() => push('โหลดรายงานไม่สำเร็จ', 'error'))
      .finally(() => setLoading(false));
  }, [date, push]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">สรุปยอดขาย (EOD)</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">ยอดขายรวม</p>
          <p className="text-3xl font-bold text-emerald-600">
            {formatBaht(report?.totalSatang ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">จำนวนบิล</p>
          <p className="text-3xl font-bold">{report?.billCount ?? 0}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-500">
          รายการบิล {loading && '· กำลังโหลด...'}
        </p>
        {report && report.bills.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="py-1">บิล #</th>
                <th className="py-1">โต๊ะ</th>
                <th className="py-1">เวลา</th>
                <th className="py-1 text-right">ยอด</th>
              </tr>
            </thead>
            <tbody>
              {report.bills.map((b) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="py-2">{b.id}</td>
                  <td className="py-2">{b.tableNumber}</td>
                  <td className="py-2">
                    {new Date(b.paidAt).toLocaleTimeString('th-TH', {
                      timeZone: 'Asia/Bangkok',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2 text-right font-medium">
                    {formatBaht(b.totalSatang)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="py-6 text-center text-slate-400">ยังไม่มีบิลในวันนี้</p>
        )}
      </div>
    </div>
  );
}
