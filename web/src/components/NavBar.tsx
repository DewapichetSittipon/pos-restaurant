import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../services/staffApi';
import { useStaffStore } from '../store/staffStore';
import { useNotifyStore } from '../store/notifyStore';
import { useSubscriptionStore } from '../store/subscriptionStore';

export function NavBar() {
  const staff = useStaffStore((s) => s.staff);
  const setStaff = useStaffStore((s) => s.setStaff);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const loadFeatures = useSubscriptionStore((s) => s.load);
  const resetFeatures = useSubscriptionStore((s) => s.reset);
  const hasFeature = useSubscriptionStore((s) => s.hasFeature);
  const featuresLoaded = useSubscriptionStore((s) => s.loaded);

  // โหลดฟีเจอร์ของแพ็กเกจครั้งเดียวเมื่อมี staff (ใช้ gate เมนู)
  useEffect(() => {
    if (staff && !featuresLoaded) void loadFeatures();
  }, [staff, featuresLoaded, loadFeatures]);

  const serviceCount = useNotifyStore((s) => s.serviceCount);
  const orderCount = useNotifyStore((s) => s.orderCount);
  const clearService = useNotifyStore((s) => s.clearService);
  const clearOrder = useNotifyStore((s) => s.clearOrder);

  // อยู่หน้าไหน เคลียร์ badge หมวดนั้น (ถือว่าเห็นแล้ว) — รวมถึงตอนมีของใหม่
  // เข้ามาขณะเปิดหน้านั้นค้างไว้ badge เลยไม่เด้งบนหน้าที่กำลังดูอยู่
  useEffect(() => {
    if (pathname === '/admin') clearService();
    if (pathname === '/kitchen') clearOrder();
  }, [pathname, serviceCount, orderCount, clearService, clearOrder]);

  async function handleLogout(): Promise<void> {
    await logout();
    setStaff(null);
    resetFeatures();
    navigate('/login', { replace: true });
  }

  const linkClass = (path: string): string =>
    `relative rounded-lg px-3 py-1.5 text-sm font-medium ${
      pathname === path ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`;

  // เมนูที่แต่ละบทบาทเห็น: OWNER เห็นครบ, WAITER เห็นแค่ผังโต๊ะ, KITCHEN เห็นแค่ครัว
  const role = staff?.role;
  const showTables = role === 'OWNER' || role === 'WAITER';
  const showKitchen = role === 'OWNER' || role === 'KITCHEN';
  const showOwnerOnly = role === 'OWNER';

  return (
    <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-1">
        {showTables && (
          <Link to="/admin" className={linkClass('/admin')}>
            ผังโต๊ะ
            <NotiDot count={serviceCount} />
          </Link>
        )}
        {showKitchen && (
          <Link to="/kitchen" className={linkClass('/kitchen')}>
            ครัว
            <NotiDot count={orderCount} />
          </Link>
        )}
        {showTables && hasFeature('shifts') && (
          <Link to="/admin/shift" className={linkClass('/admin/shift')}>
            กะ/ลิ้นชัก
          </Link>
        )}
        {showTables && hasFeature('reservations') && (
          <Link
            to="/admin/reservations"
            className={linkClass('/admin/reservations')}
          >
            จองโต๊ะ
          </Link>
        )}
        {showTables && (
          <Link to="/admin/takeaway" className={linkClass('/admin/takeaway')}>
            กลับบ้าน
          </Link>
        )}
        {showOwnerOnly && (
          <Link to="/admin/report" className={linkClass('/admin/report')}>
            ยอดขาย
          </Link>
        )}
        {showOwnerOnly && (
          <Link to="/admin/manage" className={linkClass('/admin/manage')}>
            จัดการร้าน
          </Link>
        )}
        <Link to="/admin/help" className={linkClass('/admin/help')}>
          คู่มือ
        </Link>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-500">{staff?.username}</span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700"
        >
          ออกจากระบบ
        </button>
      </div>
    </nav>
  );
}

// จุดแจ้งเตือนแดงเด้งมุมเมนู — โชว์จำนวนที่ยังไม่เห็น
function NotiDot({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-60" />
      <span className="relative grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-rose-600 px-1 text-xs font-bold text-white ring-2 ring-white">
        {count > 9 ? '9+' : count}
      </span>
    </span>
  );
}
