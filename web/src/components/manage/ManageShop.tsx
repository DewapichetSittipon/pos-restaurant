import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { fetchShop, updateShop } from '../../services/manageApi';

function errMsg(err: unknown, fallback: string): string {
  return axios.isAxiosError(err) && err.response?.data?.message
    ? String(err.response.data.message)
    : fallback;
}

interface Form {
  name: string;
  address: string;
  phone: string;
  taxId: string;
  promptpayId: string;
}

const EMPTY: Form = {
  name: '',
  address: '',
  phone: '',
  taxId: '',
  promptpayId: '',
};

export function ManageShop() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    fetchShop()
      .then((s) =>
        setForm({
          name: s.name,
          address: s.address ?? '',
          phone: s.phone ?? '',
          taxId: s.taxId ?? '',
          promptpayId: s.promptpayId ?? '',
        }),
      )
      .catch(() => setError('โหลดข้อมูลร้านไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => reload(), [reload]);

  function set<K extends keyof Form>(key: K, value: string): void {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('กรุณากรอกชื่อร้าน');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateShop(form);
      setSaved(true);
    } catch (err) {
      setError(errMsg(err, 'บันทึกไม่สำเร็จ'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-400">กำลังโหลด...</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base font-bold">ข้อมูลร้าน (หัวใบเสร็จ)</h2>
      <p className="mb-4 text-xs text-slate-400">
        ข้อมูลนี้จะแสดงบนหัวใบเสร็จตอนเช็คบิล — เว้นว่างได้ ช่องที่ว่างจะไม่พิมพ์
      </p>

      <form onSubmit={save} className="space-y-3">
        <Field label="ชื่อร้าน *">
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="เช่น ร้านอาหารตามสั่ง A"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Field>

        <Field label="ที่อยู่">
          <textarea
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="123 ถ.สุขุมวิท แขวง... เขต... กรุงเทพฯ 10110"
            rows={2}
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Field>

        <Field label="เบอร์โทร">
          <input
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="02-123-4567"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Field>

        <Field label="เลขประจำตัวผู้เสียภาษี">
          <input
            value={form.taxId}
            onChange={(e) => set('taxId', e.target.value)}
            placeholder="0-0000-00000-00-0 (ถ้ามี)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Field>

        <Field label="PromptPay (รับโอน — สร้าง QR บนใบเสร็จ)">
          <input
            value={form.promptpayId}
            onChange={(e) => set('promptpayId', e.target.value)}
            placeholder="เบอร์มือถือ หรือ เลขบัตรประชาชน"
            inputMode="numeric"
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
            {busy ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          {saved && <span className="text-sm font-medium text-emerald-600">บันทึกแล้ว ✓</span>}
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
