import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/staffApi';
import { useStaffStore } from '../store/staffStore';
import { homePathForRole } from '../lib/roles';

export function LoginPage() {
  const navigate = useNavigate();
  const setStaff = useStaffStore((s) => s.setStaff);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const staff = await login(username, password);
      setStaff(staff);
      // ครัวเริ่มที่หน้าครัว, ที่เหลือเริ่มที่ผังโต๊ะ
      navigate(homePathForRole(staff.role), { replace: true });
    } catch {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm"
      >
        <h1 className="text-center text-xl font-bold">เข้าสู่ระบบพนักงาน</h1>
        <input
          type="text"
          autoCapitalize="none"
          placeholder="ชื่อผู้ใช้"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3"
        />
        <input
          type="password"
          placeholder="รหัสผ่าน"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-3"
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
        <p className="text-center text-sm text-slate-500">
          ยังไม่มีร้าน?{' '}
          <Link to="/signup" className="font-medium text-indigo-600">
            สมัครเปิดร้าน
          </Link>
        </p>
      </form>
    </div>
  );
}
