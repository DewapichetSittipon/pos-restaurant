import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  adminLogout,
  createShop,
  deleteShop,
  fetchShops,
} from '../services/platformApi';
import { usePlatformStore } from '../store/platformStore';
import type { ShopSummary } from '../type/platform';

const EMPTY = { shopName: '', slug: '', staffUsername: '', staffPassword: '' };

export function PlatformDashboardPage() {
  const navigate = useNavigate();
  const admin = usePlatformStore((s) => s.admin);
  const setAdmin = usePlatformStore((s) => s.setAdmin);

  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ยืนยันลบ: เก็บร้านที่กำลังจะลบ + ข้อความที่ผู้ใช้พิมพ์ (ต้องตรงชื่อร้าน)
  const [confirmShop, setConfirmShop] = useState<ShopSummary | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(() => {
    fetchShops()
      .then(setShops)
      .catch(() => setError('โหลดรายชื่อร้านไม่สำเร็จ'));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleLogout(): Promise<void> {
    await adminLogout();
    setAdmin(null);
    navigate('/platform/login', { replace: true });
  }

  function update(field: keyof typeof EMPTY, value: string): void {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleCreate(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await createShop(form);
      setSuccess(
        `สร้าง "${result.shop.name}" แล้ว · login ร้าน: ${result.staff.username}`,
      );
      setForm(EMPTY);
      reload();
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'สร้างร้านไม่สำเร็จ';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function askDelete(shop: ShopSummary): void {
    setConfirmShop(shop);
    setConfirmText('');
    setError(null);
    setSuccess(null);
  }

  async function confirmDelete(): Promise<void> {
    if (!confirmShop) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteShop(confirmShop.id);
      setSuccess(`ลบร้าน "${confirmShop.name}" แล้ว`);
      setConfirmShop(null);
      reload();
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'ลบร้านไม่สำเร็จ';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold">ผู้ดูแลแพลตฟอร์ม</h1>
          <p className="text-sm text-slate-500">จัดการร้านค้าทั้งหมด</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">{admin?.username}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        {/* ฟอร์มสร้างร้าน */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold">เพิ่มร้านใหม่</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">
                ชื่อร้าน
              </span>
              <input
                type="text"
                value={form.shopName}
                onChange={(e) => update('shopName', e.target.value)}
                placeholder="เช่น ร้านอาหารตามสั่ง"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">
                slug (a-z, 0-9, -)
              </span>
              <input
                type="text"
                autoCapitalize="none"
                value={form.slug}
                onChange={(e) => update('slug', e.target.value)}
                placeholder="เช่น tamsang-bangkok"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">
                ชื่อผู้ใช้ (login ร้าน)
              </span>
              <input
                type="text"
                autoCapitalize="none"
                value={form.staffUsername}
                onChange={(e) => update('staffUsername', e.target.value)}
                placeholder="อย่างน้อย 3 ตัวอักษร"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-600">
                รหัสผ่าน
              </span>
              <input
                type="text"
                value={form.staffPassword}
                onChange={(e) => update('staffPassword', e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              />
            </label>

            {error && (
              <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>
            )}
            {success && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:col-span-2">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 py-2.5 font-semibold text-white disabled:opacity-50 sm:col-span-2"
            >
              {submitting ? 'กำลังสร้าง...' : 'สร้างร้าน + บัญชี login'}
            </button>
          </form>
        </section>

        {/* รายชื่อร้าน */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold">ร้านทั้งหมด ({shops.length})</h2>
          {shops.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">ยังไม่มีร้าน</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-2 pr-4 font-medium">ชื่อร้าน</th>
                    <th className="py-2 pr-4 font-medium">slug</th>
                    <th className="py-2 pr-4 font-medium">พนักงาน</th>
                    <th className="py-2 pr-4 font-medium">โต๊ะ</th>
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {shops.map((shop) => (
                    <tr key={shop.id} className="border-b border-slate-100">
                      <td className="py-2.5 pr-4 font-medium">{shop.name}</td>
                      <td className="py-2.5 pr-4 text-slate-500">{shop.slug}</td>
                      <td className="py-2.5 pr-4">{shop.staffCount}</td>
                      <td className="py-2.5 pr-4">{shop.tableCount}</td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => askDelete(shop)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ยืนยันลบร้าน — ต้องพิมพ์ชื่อร้านให้ตรง */}
      {confirmShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleting && setConfirmShop(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-rose-600">ลบร้านถาวร</h3>
            <p className="mt-2 text-sm text-slate-600">
              จะลบ <b>{confirmShop.name}</b> พร้อมข้อมูลทั้งหมด (พนักงาน
              {' '}{confirmShop.staffCount} · โต๊ะ {confirmShop.tableCount} · เมนู · บิล · รูป)
              <span className="mt-1 block font-medium text-rose-600">
                กู้คืนไม่ได้
              </span>
            </p>
            <p className="mt-3 text-sm text-slate-500">
              พิมพ์ชื่อร้าน <b>{confirmShop.name}</b> เพื่อยืนยัน
            </p>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
            {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmShop(null)}
                disabled={deleting}
                className="flex-1 rounded-lg bg-slate-100 py-2.5 text-sm font-semibold text-slate-700"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting || confirmText !== confirmShop.name}
                className="flex-1 rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {deleting ? 'กำลังลบ...' : 'ลบถาวร'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
