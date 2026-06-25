import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchMe } from '../services/staffApi';
import { useStaffStore } from '../store/staffStore';
import { CenterMessage } from './CenterMessage';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
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
  // ไม่มี role แล้ว — staff ที่ล็อกอินของร้านเข้าได้ทุกหน้า
  return <>{children}</>;
}
