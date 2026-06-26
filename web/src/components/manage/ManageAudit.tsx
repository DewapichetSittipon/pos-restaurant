import { useEffect, useState } from 'react';
import { fetchAuditLogs } from '../../services/manageApi';
import type { AuditLogEntry } from '../../type/manage';

// ป้ายไทย + สีตามประเภทการกระทำ
const ACTION_META: Record<string, { label: string; cls: string }> = {
  'bill.checkout': { label: 'เช็คบิล', cls: 'bg-emerald-100 text-emerald-700' },
  'bill.refund': { label: 'คืนเงิน', cls: 'bg-rose-100 text-rose-700' },
  'bill.transfer': { label: 'ย้ายโต๊ะ', cls: 'bg-indigo-100 text-indigo-700' },
  'bill.merge': { label: 'รวมบิล', cls: 'bg-indigo-100 text-indigo-700' },
  'bill.split': { label: 'แยกบิล', cls: 'bg-indigo-100 text-indigo-700' },
  'order.void': { label: 'ยกเลิกอาหาร', cls: 'bg-amber-100 text-amber-700' },
  'shift.open': { label: 'เปิดกะ', cls: 'bg-sky-100 text-sky-700' },
  'shift.close': { label: 'ปิดกะ', cls: 'bg-sky-100 text-sky-700' },
  'staff.create': { label: 'เพิ่มพนักงาน', cls: 'bg-violet-100 text-violet-700' },
  'staff.delete': { label: 'ลบพนักงาน', cls: 'bg-violet-100 text-violet-700' },
  'staff.password': { label: 'รีเซ็ตรหัส', cls: 'bg-violet-100 text-violet-700' },
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ManageAudit() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLogs()
      .then(setLogs)
      .catch(() => setError('โหลดบันทึกไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base font-bold">บันทึกการกระทำ</h2>
      <p className="mb-4 text-xs text-slate-400">
        ประวัติการเช็คบิล/คืนเงิน/ยกเลิก/เปิด-ปิดกะ/จัดการพนักงาน (ล่าสุด 100 รายการ)
      </p>

      {loading ? (
        <p className="text-sm text-slate-400">กำลังโหลด...</p>
      ) : error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : logs.length === 0 ? (
        <p className="text-sm text-slate-400">ยังไม่มีบันทึก</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {logs.map((log) => {
            const meta = ACTION_META[log.action] ?? {
              label: log.action,
              cls: 'bg-slate-100 text-slate-600',
            };
            return (
              <li key={log.id} className="flex items-start gap-3 py-2.5 text-sm">
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}
                >
                  {meta.label}
                </span>
                <span className="min-w-0 flex-1">
                  {log.detail && (
                    <span className="block text-slate-700">{log.detail}</span>
                  )}
                  <span className="text-xs text-slate-400">
                    {log.staffName} · {fmt(log.createdAt)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
