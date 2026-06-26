import { useState } from 'react';
import { downloadSalesCsv, fetchRange } from '../services/staffApi';
import { useToastStore } from '../store/toastStore';
import { formatBaht } from '../utils/money';
import { bangkokToday } from '../utils/datetime';
import type { RangeReport } from '../type/staff';

// YYYY-MM-DD เมื่อ n วันก่อน (ตามวันที่ไทยปัจจุบัน)
function daysAgo(n: number): string {
  const d = new Date(`${bangkokToday()}T00:00:00+07:00`);
  d.setDate(d.getDate() - n);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(d);
}

export function RangeReportSection() {
  const [from, setFrom] = useState(daysAgo(6)); // ค่าเริ่มต้น = 7 วันล่าสุด
  const [to, setTo] = useState(bangkokToday());
  const [report, setReport] = useState<RangeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const push = useToastStore((s) => s.push);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      setReport(await fetchRange(from, to));
    } catch {
      push('โหลดรายงานช่วงวันที่ไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv(): Promise<void> {
    setExporting(true);
    try {
      await downloadSalesCsv(from, to);
    } catch {
      push('ดาวน์โหลด CSV ไม่สำเร็จ', 'error');
    } finally {
      setExporting(false);
    }
  }

  const max = report
    ? Math.max(...report.days.map((d) => d.totalSatang), 1)
    : 1;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-slate-500">
        📅 ยอดขายช่วงวันที่
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
        />
        <span className="text-slate-400">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? 'กำลังโหลด...' : 'ดูยอด'}
        </button>
        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting}
          className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-600 disabled:opacity-50"
        >
          {exporting ? '...' : '⬇️ CSV'}
        </button>
      </div>

      {report && (
        <>
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm text-slate-500">
              รวม {report.billCount} บิล
            </span>
            <span className="text-xl font-bold text-emerald-600">
              {formatBaht(report.totalSatang)}
            </span>
          </div>
          <ul className="space-y-1">
            {report.days.map((d) => (
              <li key={d.date} className="flex items-center gap-2 text-sm">
                <span className="w-20 shrink-0 text-slate-500">{d.date}</span>
                <div className="h-3 flex-1 overflow-hidden rounded bg-slate-100">
                  <div
                    className="h-full rounded bg-emerald-400"
                    style={{ width: `${Math.round((d.totalSatang / max) * 100)}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right font-medium text-slate-700">
                  {formatBaht(d.totalSatang)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
