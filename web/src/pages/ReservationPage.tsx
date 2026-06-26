import { useCallback, useEffect, useState } from 'react';
import {
  createReservation,
  deleteReservation,
  fetchReservations,
  fetchTables,
  updateReservationStatus,
} from '../services/staffApi';
import { useToastStore } from '../store/toastStore';
import { bangkokToday } from '../utils/datetime';
import type { Reservation } from '../type/staff';

interface TableOpt {
  id: number;
  tableNumber: string;
}

const STATUS_META: Record<
  Reservation['status'],
  { label: string; cls: string }
> = {
  booked: { label: 'จองไว้', cls: 'bg-amber-100 text-amber-700' },
  seated: { label: 'มาแล้ว', cls: 'bg-emerald-100 text-emerald-700' },
  cancelled: { label: 'ยกเลิก', cls: 'bg-slate-200 text-slate-500' },
};

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ReservationPage() {
  const [date, setDate] = useState(bangkokToday());
  const [list, setList] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<TableOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const push = useToastStore((s) => s.push);

  // ฟอร์มเพิ่มการจอง
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [party, setParty] = useState('2');
  const [time, setTime] = useState('18:00');
  const [tableId, setTableId] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchReservations(date)
      .then(setList)
      .catch(() => push('โหลดการจองไม่สำเร็จ', 'error'))
      .finally(() => setLoading(false));
  }, [date, push]);

  useEffect(() => load(), [load]);
  useEffect(() => {
    fetchTables()
      .then((t) => setTables(t.map((x) => ({ id: x.id, tableNumber: x.tableNumber }))))
      .catch(() => undefined);
  }, []);

  async function handleAdd(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!name.trim()) {
      push('กรุณากรอกชื่อผู้จอง', 'error');
      return;
    }
    setSaving(true);
    try {
      // Bangkok = UTC+7 (ไม่มี DST)
      const reservedAt = new Date(`${date}T${time}:00+07:00`).toISOString();
      await createReservation({
        customerName: name.trim(),
        phone: phone.trim() || undefined,
        partySize: Math.max(1, parseInt(party, 10) || 1),
        reservedAt,
        tableId: tableId ? Number(tableId) : undefined,
        note: note.trim() || undefined,
      });
      push('บันทึกการจองแล้ว', 'success');
      setName('');
      setPhone('');
      setParty('2');
      setNote('');
      setTableId('');
      load();
    } catch {
      push('บันทึกการจองไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(
    id: number,
    status: 'seated' | 'cancelled',
  ): Promise<void> {
    try {
      await updateReservationStatus(id, status);
      load();
    } catch {
      push('อัปเดตไม่สำเร็จ', 'error');
    }
  }

  async function remove(id: number): Promise<void> {
    if (!window.confirm('ลบการจองนี้?')) return;
    try {
      await deleteReservation(id);
      load();
    } catch {
      push('ลบไม่สำเร็จ', 'error');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">จองโต๊ะ</h1>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      {/* ฟอร์มเพิ่มการจอง */}
      <form
        onSubmit={handleAdd}
        className="mb-6 grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-3"
      >
        <label className="col-span-2 sm:col-span-1">
          <span className="mb-1 block text-xs font-medium text-slate-500">ชื่อผู้จอง *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-500">เบอร์โทร</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-500">จำนวนคน</span>
          <input
            type="number"
            min={1}
            value={party}
            onChange={(e) => setParty(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-500">เวลา</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-500">โต๊ะ (ถ้ามี)</span>
          <select
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="">— ไม่ระบุ —</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                โต๊ะ {t.tableNumber}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 sm:col-span-3">
          <span className="mb-1 block text-xs font-medium text-slate-500">หมายเหตุ</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="เช่น ริมหน้าต่าง, วันเกิด"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <div className="col-span-2 sm:col-span-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : '+ เพิ่มการจอง'}
          </button>
        </div>
      </form>

      {/* รายการจองของวัน */}
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-500">
          การจองวันนี้ {loading && '· กำลังโหลด...'}
        </p>
        {list.length === 0 ? (
          <p className="py-6 text-center text-slate-400">ยังไม่มีการจอง</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <span className="w-14 shrink-0 text-center text-lg font-bold text-indigo-600">
                  {timeOf(r.reservedAt)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-slate-800">{r.customerName}</span>
                  <span className="ml-2 text-sm text-slate-400">
                    {r.partySize} คน
                    {r.table && ` · โต๊ะ ${r.table.tableNumber}`}
                  </span>
                  {(r.phone || r.note) && (
                    <span className="block text-xs text-slate-400">
                      {r.phone}
                      {r.phone && r.note && ' · '}
                      {r.note}
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_META[r.status].cls}`}
                >
                  {STATUS_META[r.status].label}
                </span>
                {r.status === 'booked' && (
                  <span className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setStatus(r.id, 'seated')}
                      className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                    >
                      มาแล้ว
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(r.id, 'cancelled')}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                    >
                      ยกเลิก
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  className="shrink-0 text-slate-300 hover:text-rose-500"
                  aria-label="ลบ"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
