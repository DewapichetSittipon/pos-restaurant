import { useState } from 'react';
import axios from 'axios';
import { changePassword } from '../../services/staffApi';
import { useStaffStore } from '../../store/staffStore';

function errMsg(err: unknown, fallback: string): string {
  return axios.isAxiosError(err) && err.response?.data?.message
    ? String(err.response.data.message)
    : fallback;
}

interface Form {
  current: string;
  next: string;
  confirm: string;
}

const EMPTY: Form = { current: '', next: '', confirm: '' };

export function ManageAccount() {
  const username = useStaffStore((s) => s.staff?.username);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof Form>(key: K, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    setError(null);
  }

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (form.next.length < 6) {
      setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (form.next !== form.confirm) {
      setError('ยืนยันรหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await changePassword(form.current, form.next);
      setForm(EMPTY);
      setSaved(true);
    } catch (err) {
      setError(errMsg(err, 'เปลี่ยนรหัสผ่านไม่สำเร็จ'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base font-bold">เปลี่ยนรหัสผ่าน</h2>
      <p className="mb-4 text-xs text-slate-400">
        บัญชีผู้ใช้: <span className="font-medium text-slate-600">{username}</span>
      </p>

      <form onSubmit={save} className="space-y-3">
        <Field label="รหัสผ่านเดิม">
          <input
            type="password"
            autoComplete="current-password"
            value={form.current}
            onChange={(e) => set('current', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Field>

        <Field label="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)">
          <input
            type="password"
            autoComplete="new-password"
            value={form.next}
            onChange={(e) => set('next', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Field>

        <Field label="ยืนยันรหัสผ่านใหม่">
          <input
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => set('confirm', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Field>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
          </button>
          {saved && (
            <span className="text-sm font-medium text-emerald-600">
              เปลี่ยนรหัสผ่านแล้ว ✓
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
