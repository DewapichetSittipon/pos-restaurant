import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchMe } from '../services/staffApi';
import { useStaffStore } from '../store/staffStore';
import { CenterMessage } from './CenterMessage';
import { PendingApprovalPage } from '../pages/PendingApprovalPage';
import { homePathForRole } from '../lib/roles';
import type { StaffRole } from '../type/staff';

interface ProtectedRouteProps {
  children: ReactNode;
  // ถ้าระบุ จะให้เข้าได้เฉพาะบทบาทเหล่านี้ (ไม่ระบุ = ทุกบทบาทที่ล็อกอินแล้ว)
  allowedRoles?: StaffRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const staff = useStaffStore((s) => s.staff);
  const setStaff = useStaffStore((s) => s.setStaff);
  const [state, setState] = useState<'checking' | 'ok' | 'denied'>(
    staff ? 'ok' : 'checking',
  );

  useEffect(() => {
    if (staff) {
      setState('ok');
      return;
    }
    fetchMe()
      .then((s) => {
        setStaff(s);
        setState('ok');
      })
      .catch(() => setState('denied'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'checking') {
    return <CenterMessage title="กำลังตรวจสอบสิทธิ์..." />;
  }
  if (state === 'denied') {
    return <Navigate to="/login" replace />;
  }
  // ร้านที่ยังไม่อนุมัติ — login ได้แต่เห็นหน้ารออนุมัติแทนทุกหน้า
  if (staff?.shopStatus === 'pending') {
    return <PendingApprovalPage />;
  }
  // บทบาทไม่ตรงกับหน้านี้ — เด้งกลับหน้าแรกของบทบาทตัวเอง (กันพิมพ์ URL ตรงๆ)
  if (staff && allowedRoles && !allowedRoles.includes(staff.role)) {
    return <Navigate to={homePathForRole(staff.role)} replace />;
  }
  // staff ของร้าน active ที่บทบาทผ่าน — เข้าได้
  return <>{children}</>;
}
