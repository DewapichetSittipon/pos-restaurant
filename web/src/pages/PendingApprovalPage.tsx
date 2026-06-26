import { useNavigate } from 'react-router-dom';
import { logout } from '../services/staffApi';
import { useStaffStore } from '../store/staffStore';

// หน้าที่ร้าน pending เห็นแทนทุกหน้า — login ได้แต่ยังใช้งานไม่ได้จนกว่าจะอนุมัติ
export function PendingApprovalPage() {
  const navigate = useNavigate();
  const staff = useStaffStore((s) => s.staff);
  const setStaff = useStaffStore((s) => s.setStaff);

  async function handleLogout(): Promise<void> {
    await logout();
    setStaff(null);
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="text-5xl">⏳</div>
        <h1 className="text-xl font-bold">รอการอนุมัติ</h1>
        <p className="text-sm text-slate-600">
          บัญชี <b>{staff?.username}</b> สมัครเรียบร้อยแล้ว
          ผู้ดูแลระบบกำลังตรวจสอบ เมื่ออนุมัติแล้วจะเข้าใช้งานได้ทันที
          (ลองเข้าสู่ระบบใหม่อีกครั้งภายหลัง)
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg bg-slate-100 py-2.5 text-sm font-semibold text-slate-700"
        >
          ออกจากระบบ
        </button>
      </div>
    </div>
  );
}
