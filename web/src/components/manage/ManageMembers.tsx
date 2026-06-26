import { useEffect, useState } from 'react';
import axios from 'axios';
import { createMember, fetchMembers } from '../../services/staffApi';
import type { Member } from '../../type/staff';

function errMsg(err: unknown, fallback: string): string {
  return axios.isAxiosError(err) && err.response?.data?.message
    ? String(err.response.data.message)
    : fallback;
}

export function ManageMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
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
      await createMember(phone.trim(), name.trim() || undefined);
      setPhone('');
      setName('');
      reload();
    } catch (err) {
      setError(errMsg(err, 'เพิ่มสมาชิกไม่สำเร็จ'));
    } finally {
      setBusy(false);
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
            <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
              <span>
                <span className="font-medium text-slate-800">
                  {m.name || m.phone}
                </span>
                {m.name && <span className="ml-2 text-slate-400">{m.phone}</span>}
              </span>
              <span className="font-semibold text-amber-600">{m.points} แต้ม</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
