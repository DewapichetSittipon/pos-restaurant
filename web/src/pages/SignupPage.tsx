import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { signup } from '../services/platformApi';
import { login } from '../services/staffApi';
import { useStaffStore } from '../store/staffStore';

const EMPTY = {
  shopName: '',
  contactName: '',
  phone: '',
  staffUsername: '',
  staffPassword: '',
};

export function SignupPage() {
  const navigate = useNavigate();
  const setStaff = useStaffStore((s) => s.setStaff);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // สมัคร -> สร้างร้าน pending แล้ว login ด้วย credential เดิมเข้าไปเลย
      await signup({
        shopName: form.shopName,
        contactName: form.contactName,
        phone: form.phone || undefined,
        staffUsername: form.staffUsername,
        staffPassword: form.staffPassword,
      });
      const staff = await login(form.staffUsername, form.staffPassword);
      setStaff(staff);
      navigate('/admin', { replace: true });
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'สมัครไม่สำเร็จ ลองใหม่อีกครั้ง';
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm"
      >
        <div className="text-center">
          <h1 className="text-xl font-bold">สมัครเปิดร้าน</h1>
          <p className="mt-1 text-sm text-slate-500">
            ตั้งบัญชีเข้าใช้งานเอง · เริ่มใช้ได้หลังผู้ดูแลอนุมัติ
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
            เบอร์ติดต่อ (ไม่บังคับ)
          </span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            placeholder="08x-xxx-xxxx"
            className="w-full rounded-lg border border-slate-300 px-4 py-3"
          />
        </label>

        <hr className="border-slate-200" />

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            ชื่อผู้ใช้ (สำหรับเข้าระบบ)
          </span>
          <input
            type="text"
            autoCapitalize="none"
            value={form.staffUsername}
            onChange={(e) => update('staffUsername', e.target.value)}
            placeholder="อย่างน้อย 3 ตัวอักษร"
            className="w-full rounded-lg border border-slate-300 px-4 py-3"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            รหัสผ่าน
          </span>
          <input
            type="password"
            value={form.staffPassword}
            onChange={(e) => update('staffPassword', e.target.value)}
            placeholder="อย่างน้อย 6 ตัวอักษร"
            className="w-full rounded-lg border border-slate-300 px-4 py-3"
          />
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'กำลังสมัคร...' : 'สมัครเปิดร้าน'}
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
