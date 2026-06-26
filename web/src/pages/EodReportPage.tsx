import { useEffect, useState } from 'react';
import { fetchEod, fetchPrepTimes, fetchTopMenus } from '../services/staffApi';
import { useToastStore } from '../store/toastStore';
import { formatBaht } from '../utils/money';
import { bangkokToday } from '../utils/datetime';
import { BillDetailModal } from '../components/BillDetailModal';
import type {
  EodReport,
  PrepTimesReport,
  TopMenusReport,
} from '../type/staff';

// วินาที -> "X นาที Y วิ" (หรือ "Y วิ" ถ้าน้อยกว่า 1 นาที)
function formatDuration(sec: number): string {
  if (sec < 60) return `${sec} วิ`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m} นาที` : `${m} นาที ${s} วิ`;
}

export function EodReportPage() {
  const [date, setDate] = useState(bangkokToday());
  const [report, setReport] = useState<EodReport | null>(null);
  const [topMenus, setTopMenus] = useState<TopMenusReport | null>(null);
  const [prepTimes, setPrepTimes] = useState<PrepTimesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchEod(date), fetchTopMenus(date), fetchPrepTimes(date)])
      .then(([eod, top, prep]) => {
        setReport(eod);
        setTopMenus(top);
        setPrepTimes(prep);
      })
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

      {/* เมนูขายดี */}
      {topMenus && topMenus.menus.length > 0 && (
        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-500">
            🔥 เมนูขายดี
          </p>
          <ul className="space-y-2">
            {topMenus.menus.map((m, i) => (
              <li
                key={m.itemName}
                className="flex items-center gap-3 text-sm"
              >
                <span className="w-5 text-center font-bold text-slate-400">
                  {i + 1}
                </span>
                <span className="flex-1 font-medium">{m.itemName}</span>
                <span className="text-slate-400">×{m.quantity}</span>
                <span className="w-20 text-right font-medium text-emerald-600">
                  {formatBaht(m.revenueSatang)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* เวลาเตรียมอาหารเฉลี่ย */}
      {prepTimes && prepTimes.servedCount > 0 && (
        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-500">
            <span>⏱️ เวลาเตรียมอาหารเฉลี่ย</span>
            <span className="text-slate-700">
              รวม {formatDuration(prepTimes.overallAvgSec)}
              <span className="ml-1 font-normal text-slate-400">
                ({prepTimes.servedCount} จาน)
              </span>
            </span>
          </p>
          <ul className="space-y-2">
            {prepTimes.menus.slice(0, 10).map((m) => (
              <li key={m.itemName} className="flex items-center gap-3 text-sm">
                <span className="flex-1 font-medium">{m.itemName}</span>
                <span className="text-slate-400">×{m.count}</span>
                <span className="w-24 text-right font-medium text-amber-600">
                  {formatDuration(m.avgSec)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-500">
          รายการบิล{' '}
          <span className="font-normal text-slate-400">· แตะเพื่อดูรายการเมนู</span>
          {loading && ' · กำลังโหลด...'}
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
                <tr
                  key={b.id}
                  onClick={() => setSelectedBillId(b.id)}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="py-2 font-medium text-emerald-600">#{b.id}</td>
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

      {selectedBillId !== null && (
        <BillDetailModal
          billId={selectedBillId}
          onClose={() => setSelectedBillId(null)}
        />
      )}
    </div>
  );
}
