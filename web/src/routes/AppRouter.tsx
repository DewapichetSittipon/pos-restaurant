import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TablePage } from '../pages/TablePage';
import { LoginPage } from '../pages/LoginPage';
import { AdminGridPage } from '../pages/AdminGridPage';
import { KitchenPage } from '../pages/KitchenPage';
import { EodReportPage } from '../pages/EodReportPage';
import { ManagePage } from '../pages/ManagePage';
import { SignupPage } from '../pages/SignupPage';
import { StaffLayout } from '../components/StaffLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { PlatformLoginPage } from '../pages/PlatformLoginPage';
import { PlatformDashboardPage } from '../pages/PlatformDashboardPage';
import { PlatformProtectedRoute } from '../components/PlatformProtectedRoute';
import { CenterMessage } from '../components/CenterMessage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ลูกค้า */}
        <Route path="/table/:tableId" element={<TablePage />} />

        {/* ผู้ดูแลแพลตฟอร์ม (เหนือทุกร้าน) */}
        <Route path="/platform/login" element={<PlatformLoginPage />} />
        <Route
          path="/platform"
          element={
            <PlatformProtectedRoute>
              <PlatformDashboardPage />
            </PlatformProtectedRoute>
          }
        />

        {/* ร้านค้าสมัครเปิดร้านเอง (public) */}
        <Route path="/signup" element={<SignupPage />} />

        {/* พนักงาน */}
        <Route path="/login" element={<LoginPage />} />
        <Route element={<StaffLayout />}>
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'WAITER']}>
                <AdminGridPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/report"
            element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <EodReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kitchen"
            element={
              <ProtectedRoute allowedRoles={['OWNER', 'KITCHEN']}>
                <KitchenPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manage"
            element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <ManagePage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="*"
          element={<CenterMessage icon="🍽️" title="ไม่พบหน้าที่ต้องการ" />}
        />
      </Routes>
    </BrowserRouter>
  );
}
