import { useCallback, useEffect, useState } from 'react';
import {
  fetchEod,
  fetchHourly,
  fetchPrepTimes,
  fetchTopMenus,
} from '../services/staffApi';
import { useToastStore } from '../store/toastStore';
import { formatBaht } from '../utils/money';
import { bangkokToday } from '../utils/datetime';
import { BillDetailModal } from '../components/BillDetailModal';
import { RangeReportSection } from '../components/RangeReportSection';
import { useSubscriptionStore } from '../store/subscriptionStore';
import type {
  EodReport,
  HourlyReport,
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
  const [hourly, setHourly] = useState<HourlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const push = useToastStore((s) => s.push);
  // รายงานย้อนหลัง/รายชั่วโมง/export = ฟีเจอร์แพ็กเกจโปร (รายงานวันนี้ใช้ได้ทุกแพ็กเกจ)
  const canReportHistory = useSubscriptionStore((s) =>
    s.hasFeature('report_history'),
  );

  const load = useCallback(() => {
    setLoading(true);
    // รายงานวันนี้ (eod/top/prep) ใช้ได้ทุกแพ็กเกจ; hourly เฉพาะแพ็กเกจที่รองรับ
    Promise.all([
      fetchEod(date),
      fetchTopMenus(date),
      fetchPrepTimes(date),
      canReportHistory ? fetchHourly(date) : Promise.resolve(null),
    ])
      .then(([eod, top, prep, hrs]) => {
        setReport(eod);
        setTopMenus(top);
        setPrepTimes(prep);
        setHourly(hrs);
      })
      .catch(() => push('โหลดรายงานไม่สำเร็จ', 'error'))
      .finally(() => setLoading(false));
  }, [date, push, canReportHistory]);

  useEffect(() => load(), [load]);

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

      {/* แยกตามวิธีชำระ + ภาษี/เซอร์วิส */}
      {report && report.billCount > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 text-sm shadow-sm sm:grid-cols-4">
          <Stat label="เงินสด" value={formatBaht(report.cashSatang)} />
          <Stat label="เงินโอน" value={formatBaht(report.transferSatang)} />
          <Stat label="เซอร์วิสชาร์จ" value={formatBaht(report.serviceChargeSatang)} />
          <Stat label="VAT" value={formatBaht(report.vatSatang)} />
          {report.refundedCount > 0 && (
            <Stat
              label={`คืนเงิน (${report.refundedCount})`}
              value={`-${formatBaht(report.refundedSatang)}`}
            />
          )}
        </div>
      )}

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

      {/* ยอดขายรายชั่วโมง */}
      {canReportHistory && hourly && hourly.hours.some((h) => h.totalSatang > 0) && (
        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-500">
            🕒 ยอดขายรายชั่วโมง
          </p>
          <HourlyChart hours={hourly.hours} />
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
                  <td className="py-2 font-medium text-emerald-600">
                    #{b.id}
                    {b.status === 'refunded' && (
                      <span className="ml-1 rounded bg-rose-100 px-1.5 py-0.5 text-xs font-semibold text-rose-600">
                        คืนเงิน
                      </span>
                    )}
                  </td>
                  <td className="py-2">{b.tableNumber}</td>
                  <td className="py-2">
                    {new Date(b.paidAt).toLocaleTimeString('th-TH', {
                      timeZone: 'Asia/Bangkok',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td
                    className={`py-2 text-right font-medium ${
                      b.status === 'refunded' ? 'text-slate-400 line-through' : ''
                    }`}
                  >
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

      {/* ยอดขายช่วงวันที่ (สัปดาห์/เดือน) — เฉพาะแพ็กเกจที่รองรับ */}
      {canReportHistory && (
        <div className="mt-6">
          <RangeReportSection />
        </div>
      )}

      {selectedBillId !== null && (
        <BillDetailModal
          billId={selectedBillId}
          onClose={() => setSelectedBillId(null)}
          onRefunded={load}
        />
      )}
    </div>
  );
}

// แท่งยอดขายรายชั่วโมง (CSS bars) — โชว์เฉพาะช่วงที่มีการขาย
function HourlyChart({
  hours,
}: {
  hours: { hour: number; totalSatang: number; billCount: number }[];
}) {
  const max = Math.max(...hours.map((h) => h.totalSatang), 1);
  // แสดงตั้งแต่ชั่วโมงแรกที่มียอด ถึงชั่วโมงสุดท้ายที่มียอด (ลดช่องว่าง)
  const active = hours.filter((h) => h.totalSatang > 0);
  const first = active[0]?.hour ?? 0;
  const last = active[active.length - 1]?.hour ?? 23;
  const shown = hours.filter((h) => h.hour >= first && h.hour <= last);
  return (
    <div className="flex items-end gap-1 overflow-x-auto pb-1">
      {shown.map((h) => (
        <div key={h.hour} className="flex w-8 shrink-0 flex-col items-center gap-1">
          <span className="text-[10px] text-slate-400">
            {h.totalSatang > 0 ? formatBaht(h.totalSatang).replace('฿', '') : ''}
          </span>
          <div
            className="w-5 rounded-t bg-emerald-400"
            style={{ height: `${Math.round((h.totalSatang / max) * 80) + 2}px` }}
            title={`${h.hour}:00 · ${formatBaht(h.totalSatang)} · ${h.billCount} บิล`}
          />
          <span className="text-[10px] text-slate-500">{h.hour}</span>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-bold text-slate-700">{value}</p>
    </div>
  );
}
