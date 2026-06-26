import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  createStaff,
  deleteStaff,
  fetchStaff,
  setStaffPassword,
} from '../../services/staffApi';
import { useStaffStore } from '../../store/staffStore';
import { useToastStore } from '../../store/toastStore';
import type { StaffMember } from '../../type/staff';

function errMsg(err: unknown, fallback: string): string {
  return axios.isAxiosError(err) && err.response?.data?.message
    ? String(err.response.data.message)
    : fallback;
}

export function ManageStaff() {
  const myId = useStaffStore((s) => s.staff?.id);
  const push = useToastStore((s) => s.push);
  const [list, setList] = useState<StaffMember[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // แถวที่กำลังตั้งรหัสใหม่: staffId -> ค่ารหัสที่พิมพ์
  const [resetId, setResetId] = useState<number | null>(null);
  const [resetPw, setResetPw] = useState('');

  const reload = useCallback(() => {
    fetchStaff()
      .then(setList)
      .catch(() => setError('โหลดรายชื่อพนักงานไม่สำเร็จ'));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleAdd(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    if (username.trim().length < 3) {
      setError('ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร');
      return;
    }
    if (password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    setBusy(true);
    try {
      await createStaff(username.trim(), password);
      push(`เพิ่มพนักงาน "${username.trim()}" แล้ว`, 'success');
      setUsername('');
      setPassword('');
      reload();
    } catch (err) {
      setError(errMsg(err, 'เพิ่มพนักงานไม่สำเร็จ'));
    } finally {
      setBusy(false);
    }
  }

  async function handleResetSave(id: number): Promise<void> {
    if (resetPw.length < 6) {
      setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setStaffPassword(id, resetPw);
      push('เปลี่ยนรหัสผ่านแล้ว', 'success');
      setResetId(null);
      setResetPw('');
    } catch (err) {
      setError(errMsg(err, 'เปลี่ยนรหัสไม่สำเร็จ'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(member: StaffMember): Promise<void> {
    if (!window.confirm(`ลบพนักงาน "${member.username}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteStaff(member.id);
      push(`ลบ "${member.username}" แล้ว`, 'success');
      reload();
    } catch (err) {
      setError(errMsg(err, 'ลบไม่สำเร็จ'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* เพิ่มพนักงาน */}
      <form
        onSubmit={handleAdd}
        className="space-y-3 rounded-2xl bg-white p-5 shadow-sm"
      >
        <h2 className="text-base font-bold">เพิ่มพนักงาน</h2>
        <input
          type="text"
          autoCapitalize="none"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ชื่อผู้ใช้ (อย่างน้อย 3 ตัวอักษร)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white disabled:opacity-50"
        >
          เพิ่มพนักงาน
        </button>
      </form>

      {/* รายชื่อพนักงาน */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-bold">พนักงานทั้งหมด ({list.length})</h2>
        <ul className="divide-y divide-slate-100">
          {list.map((member) => (
            <li key={member.id} className="py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {member.username}
                  {member.id === myId && (
                    <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                      คุณ
                    </span>
                  )}
                </span>
                <div className="flex shrink-0 gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setResetId(resetId === member.id ? null : member.id);
                      setResetPw('');
                      setError(null);
                    }}
                    className="font-medium text-indigo-600"
                  >
                    เปลี่ยนรหัส
                  </button>
                  {member.id !== myId && (
                    <button
                      type="button"
                      onClick={() => handleDelete(member)}
                      className="font-medium text-rose-500"
                    >
                      ลบ
                    </button>
                  )}
                </div>
              </div>

              {resetId === member.id && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={resetPw}
                    onChange={(e) => setResetPw(e.target.value)}
                    placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleResetSave(member.id)}
                    disabled={busy}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    บันทึก
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
