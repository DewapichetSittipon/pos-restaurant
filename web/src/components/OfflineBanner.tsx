import { useEffect, useState } from 'react';

// แถบเตือนเมื่อเน็ตหลุด — ร้านอาหารเน็ตหลุดบ่อย ต้องรู้ตัวว่าข้อมูลที่เห็นอาจไม่อัปเดต
// ใช้ navigator.onLine + event online/offline (เบา ไม่ poll)
export function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && !navigator.onLine,
  );

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] bg-red-600 px-4 py-1.5 text-center text-sm font-medium text-white shadow">
      ⚠️ ออฟไลน์ — ข้อมูลอาจไม่อัปเดต ระบบจะกลับมาทำงานเมื่อเชื่อมต่ออินเทอร์เน็ตได้
    </div>
  );
}
