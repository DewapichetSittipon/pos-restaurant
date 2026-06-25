import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchAdminMe } from '../services/platformApi';
import { usePlatformStore } from '../store/platformStore';
import { CenterMessage } from './CenterMessage';

interface PlatformProtectedRouteProps {
  children: ReactNode;
}

export function PlatformProtectedRoute({ children }: PlatformProtectedRouteProps) {
  const admin = usePlatformStore((s) => s.admin);
  const setAdmin = usePlatformStore((s) => s.setAdmin);
  const [state, setState] = useState<'checking' | 'ok' | 'denied'>(
    admin ? 'ok' : 'checking',
  );

  useEffect(() => {
    if (admin) {
      setState('ok');
      return;
    }
    fetchAdminMe()
      .then((a) => {
        setAdmin(a);
        setState('ok');
      })
      .catch(() => setState('denied'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'checking') {
    return <CenterMessage title="กำลังตรวจสอบสิทธิ์..." />;
  }
  if (state === 'denied') {
    return <Navigate to="/platform/login" replace />;
  }
  return <>{children}</>;
}
