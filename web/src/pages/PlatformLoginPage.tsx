import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../services/platformApi';
import { usePlatformStore } from '../store/platformStore';

export function PlatformLoginPage() {
  const navigate = useNavigate();
  const setAdmin = usePlatformStore((s) => s.setAdmin);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const admin = await adminLogin(username, password);
      setAdmin(admin);
      navigate('/platform', { replace: true });
    } catch {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="text-center">
          <h1 className="text-xl font-bold">ผู้ดูแลแพลตฟอร์ม</h1>
          <p className="mt-1 text-sm text-slate-500">จัดการร้านค้าทั้งหมด</p>
        </div>
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
          className="w-full rounded-lg bg-slate-900 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  );
}
