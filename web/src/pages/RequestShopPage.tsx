import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { submitShopRequest } from '../services/platformApi';

const EMPTY = { shopName: '', contactName: '', phone: '', note: '' };

export function RequestShopPage() {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function update(field: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitShopRequest(form);
      setDone(true);
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'ส่งคำขอไม่สำเร็จ ลองใหม่อีกครั้ง';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-6 text-center shadow-sm">
          <div className="text-4xl">✅</div>
          <h1 className="text-xl font-bold">ได้รับคำขอแล้ว</h1>
          <p className="text-sm text-slate-600">
            ทีมงานจะติดต่อกลับที่เบอร์ <b>{form.phone}</b> เพื่อยืนยันและเปิดร้านให้
          </p>
          <Link
            to="/login"
            className="inline-block pt-2 text-sm font-medium text-indigo-600"
          >
            ← กลับหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm"
      >
        <div className="text-center">
          <h1 className="text-xl font-bold">ขอเปิดร้านใหม่</h1>
          <p className="mt-1 text-sm text-slate-500">
            กรอกข้อมูลเพื่อให้ทีมงานติดต่อกลับ
          </p>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            ชื่อร้าน
          </span>
          <input
            type="text"
            value={form.shopName}
            onChange={(e) => update('shopName', e.target.value)}
            placeholder="เช่น ร้านอาหารตามสั่ง"
            className="w-full rounded-lg border border-slate-300 px-4 py-3"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            ชื่อผู้ติดต่อ
          </span>
          <input
            type="text"
            value={form.contactName}
            onChange={(e) => update('contactName', e.target.value)}
            placeholder="ชื่อ-นามสกุล"
            className="w-full rounded-lg border border-slate-300 px-4 py-3"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            เบอร์ติดต่อกลับ
          </span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="08x-xxx-xxxx"
            className="w-full rounded-lg border border-slate-300 px-4 py-3"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            รายละเอียดเพิ่มเติม (ไม่บังคับ)
          </span>
          <textarea
            value={form.note}
            onChange={(e) => update('note', e.target.value)}
            rows={3}
            placeholder="ประเภทร้าน จำนวนโต๊ะ หรือคำถามถึงทีมงาน"
            className="w-full rounded-lg border border-slate-300 px-4 py-3"
          />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'กำลังส่ง...' : 'ส่งคำขอเปิดร้าน'}
        </button>

        <Link
          to="/login"
          className="block text-center text-sm font-medium text-slate-500"
        >
          มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
        </Link>
      </form>
    </div>
  );
}
