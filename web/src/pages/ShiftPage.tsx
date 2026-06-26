import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  closeShift,
  fetchCurrentShift,
  fetchShifts,
  openShift,
} from '../services/staffApi';
import { useToastStore } from '../store/toastStore';
import { formatBaht } from '../utils/money';
import type { Shift } from '../type/staff';

// บาท (ข้อความ) -> สตางค์ (ว่าง/ไม่ใช่ตัวเลข = 0)
function toSatang(baht: string): number {
  const n = parseFloat(baht);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ShiftPage() {
  const [current, setCurrent] = useState<Shift | null>(null);
  const [history, setHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const push = useToastStore((s) => s.push);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([fetchCurrentShift(), fetchShifts()])
      .then(([cur, list]) => {
        setCurrent(cur);
        setHistory(list);
      })
      .catch(() => push('โหลดข้อมูลกะไม่สำเร็จ', 'error'))
      .finally(() => setLoading(false));
  }, [push]);

  useEffect(() => reload(), [reload]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <p className="text-sm text-slate-400">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">กะ / เงินลิ้นชัก</h1>

      {current ? (
        <OpenShiftCard
          shift={current}
          busy={busy}
          onClose={async (counted, note) => {
            setBusy(true);
            try {
              await closeShift(counted, note);
              push('ปิดกะแล้ว', 'success');
              reload();
            } catch {
              push('ปิดกะไม่สำเร็จ', 'error');
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : (
        <OpenShiftForm
          busy={busy}
          onOpen={async (openingCash) => {
            setBusy(true);
            try {
              await openShift(openingCash);
              push('เปิดกะแล้ว', 'success');
              reload();
            } catch {
              push('เปิดกะไม่สำเร็จ (อาจมีกะเปิดอยู่)', 'error');
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      <h2 className="mb-2 mt-8 text-base font-bold text-slate-700">
        ประวัติกะ
      </h2>
      {history.filter((s) => s.status === 'closed').length === 0 ? (
        <p className="text-sm text-slate-400">ยังไม่มีกะที่ปิดแล้ว</p>
      ) : (
        <div className="space-y-2">
          {history
            .filter((s) => s.status === 'closed')
            .map((s) => (
              <ClosedShiftRow key={s.id} shift={s} />
            ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={`flex justify-between ${
        strong ? 'border-t border-slate-200 pt-2 text-base font-bold' : 'text-slate-600'
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

// การ์ดกะที่เปิดอยู่ — โชว์ยอดสด + ฟอร์มปิดกะ
function OpenShiftCard({
  shift,
  busy,
  onClose,
}: {
  shift: Shift;
  busy: boolean;
  onClose: (countedSatang: number, note?: string) => void;
}) {
  const [countedInput, setCountedInput] = useState('');
  const [note, setNote] = useState('');
  const s = shift.summary;
  const counted = toSatang(countedInput);
  const diff = useMemo(
    () => (countedInput.trim() ? counted - s.expectedCashSatang : null),
    [countedInput, counted, s.expectedCashSatang],
  );

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> กำลังเปิดกะ
        </span>
        <span className="text-xs text-slate-400">
          {shift.openedByName} · {fmtTime(shift.openedAt)}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <Row label="เงินตั้งต้นในลิ้นชัก" value={formatBaht(shift.openingCash)} />
        <Row label={`ยอดเงินสด (${s.billCount} บิล)`} value={formatBaht(s.cashSatang)} />
        <Row label="ยอดเงินโอน" value={formatBaht(s.transferSatang)} />
        <Row
          label="เงินสดที่ควรมีในลิ้นชัก"
          value={formatBaht(s.expectedCashSatang)}
          strong
        />
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="mb-2 text-sm font-bold text-slate-700">ปิดกะ — นับเงินจริง</h3>
        <label className="flex items-center justify-between gap-2 text-sm">
          <span className="text-slate-500">เงินสดที่นับได้</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={countedInput}
            onChange={(e) => setCountedInput(e.target.value)}
            placeholder="0"
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-right"
          />
        </label>
        {diff !== null && (
          <div
            className={`mt-2 flex justify-between text-sm font-semibold ${
              diff === 0
                ? 'text-slate-600'
                : diff > 0
                  ? 'text-emerald-700'
                  : 'text-rose-600'
            }`}
          >
            <span>{diff === 0 ? 'พอดี' : diff > 0 ? 'เงินเกิน' : 'เงินขาด'}</span>
            <span>{formatBaht(Math.abs(diff))}</span>
          </div>
        )}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="หมายเหตุ (ถ้ามีส่วนต่าง)"
          className="mt-3 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={busy || !countedInput.trim()}
          onClick={() => onClose(counted, note.trim() || undefined)}
          className="mt-3 w-full rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'กำลังปิดกะ...' : 'ปิดกะ'}
        </button>
      </div>
    </section>
  );
}

// ฟอร์มเปิดกะใหม่
function OpenShiftForm({
  busy,
  onOpen,
}: {
  busy: boolean;
  onOpen: (openingCashSatang: number) => void;
}) {
  const [input, setInput] = useState('');
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-slate-700">เปิดกะใหม่</h2>
      <p className="mb-3 mt-0.5 text-xs text-slate-400">
        กรอกเงินทอนตั้งต้นที่ใส่ในลิ้นชักก่อนเริ่มขาย
      </p>
      <label className="flex items-center justify-between gap-2 text-sm">
        <span className="text-slate-500">เงินตั้งต้น (บาท)</span>
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="0"
          className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-right"
        />
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={() => onOpen(toSatang(input))}
        className="mt-4 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'กำลังเปิดกะ...' : 'เปิดกะ'}
      </button>
    </section>
  );
}

// แถวประวัติกะที่ปิดแล้ว
function ClosedShiftRow({ shift }: { shift: Shift }) {
  const s = shift.summary;
  const diff = s.diffSatang ?? 0;
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700">
          {fmtTime(shift.openedAt)} → {shift.closedAt ? fmtTime(shift.closedAt) : '-'}
        </span>
        <span className="font-bold text-emerald-600">{formatBaht(s.totalSatang)}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
        <span>เงินสด {formatBaht(s.cashSatang)}</span>
        <span>โอน {formatBaht(s.transferSatang)}</span>
        <span>{s.billCount} บิล</span>
        <span
          className={
            diff === 0
              ? 'text-slate-500'
              : diff > 0
                ? 'text-emerald-600'
                : 'text-rose-600'
          }
        >
          {diff === 0 ? 'เงินพอดี' : diff > 0 ? `เกิน ${formatBaht(diff)}` : `ขาด ${formatBaht(-diff)}`}
        </span>
      </div>
      {shift.note && <p className="mt-1 text-xs text-slate-400">📝 {shift.note}</p>}
    </div>
  );
}
