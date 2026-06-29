import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  createMember,
  fetchMembers,
  updateMember,
} from '../../services/staffApi';
import type { Member } from '../../type/staff';

function errMsg(err: unknown, fallback: string): string {
  return axios.isAxiosError(err) && err.response?.data?.message
    ? String(err.response.data.message)
    : fallback;
}

// ISO date → "YYY-MM-DD" สำหรับ input type=date (null = ว่าง)
function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

export function ManageMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload(): void {
    fetchMembers()
      .then(setMembers)
      .catch(() => setError('โหลดสมาชิกไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function add(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!phone.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createMember(
        phone.trim(),
        name.trim() || undefined,
        birthDate || undefined,
      );
      setPhone('');
      setName('');
      setBirthDate('');
      reload();
    } catch (err) {
      setError(errMsg(err, 'เพิ่มสมาชิกไม่สำเร็จ'));
    } finally {
      setBusy(false);
    }
  }

  // แก้วันเกิดสมาชิกที่มีอยู่ (ใช้กับโปรวันเกิด)
  async function changeBirthday(id: number, value: string): Promise<void> {
    if (!value) return;
    try {
      await updateMember(id, { birthDate: value });
      setMembers((ms) =>
        ms.map((m) => (m.id === id ? { ...m, birthDate: value } : m)),
      );
    } catch {
      setError('อัปเดตวันเกิดไม่สำเร็จ');
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base font-bold">สมาชิก / แต้มสะสม</h2>
      <p className="mb-4 text-xs text-slate-400">
        เพิ่มสมาชิกล่วงหน้าได้ที่นี่ หรือสมัครหน้างานตอนเช็คบิล · ตั้งอัตราแต้มที่แท็บ
        “ข้อมูลร้าน”
      </p>

      <form onSubmit={add} className="mb-5 flex flex-wrap gap-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="เบอร์โทร"
          inputMode="tel"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ชื่อ (ถ้ามี)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          title="วันเกิด (สำหรับโปรวันเกิด)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-slate-600"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
        >
          + เพิ่ม
        </button>
      </form>

      {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">กำลังโหลด...</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-slate-400">ยังไม่มีสมาชิก</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
              <span className="min-w-0">
                <span className="font-medium text-slate-800">
                  {m.name || m.phone}
                </span>
                {m.name && <span className="ml-2 text-slate-400">{m.phone}</span>}
              </span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs text-slate-400">
                  🎂
                  <input
                    type="date"
                    value={toDateInput(m.birthDate)}
                    onChange={(e) => changeBirthday(m.id, e.target.value)}
                    className="rounded border border-slate-200 px-1.5 py-1 text-slate-600"
                  />
                </label>
                <span className="font-semibold text-amber-600">
                  {m.points} แต้ม
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
