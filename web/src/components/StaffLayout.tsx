import { Outlet } from 'react-router-dom';
import { NavBar } from './NavBar';
import { Toaster } from './Toaster';
import { useStaffNotifications } from '../hooks/useStaffNotifications';

export function StaffLayout() {
  useStaffNotifications();
  return (
    <div className="min-h-screen">
      <NavBar />
      <Toaster />
      <Outlet />
    </div>
  );
}
