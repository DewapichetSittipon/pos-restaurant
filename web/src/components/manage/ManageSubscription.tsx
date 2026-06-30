import { useEffect, useState } from 'react';
import { fetchSubscription } from '../../services/manageApi';
import type { SubscriptionSummary } from '../../type/manage';

// feature key (ตรงกับ backend common/plan-access.ts) -> ป้ายภาษาไทย + ลำดับแสดง
const FEATURE_LABELS: { key: string; label: string }[] = [
  { key: 'report_history', label: 'รายงานย้อนหลัง + export' },
  { key: 'promotions', label: 'โปรโมชั่น (happy hour / BOGO / สมาชิก)' },
  { key: 'loyalty', label: 'สมาชิก / สะสมแต้ม' },
  { key: 'i18n', label: 'เมนูหลายภาษา' },
  { key: 'reservations', label: 'จองโต๊ะ' },
  { key: 'shifts', label: 'กะ / ปิดยอดลิ้นชัก' },
  { key: 'escpos_print', label: 'พิมพ์ครัวตรง ESC/POS' },
  { key: 'vat', label: 'VAT / ใบกำกับภาษี' },
  { key: 'multi_branch', label: 'หลายสาขา' },
];

const STATUS_LABELS: Record<string, string> = {
  trialing: 'ทดลองใช้',
  active: 'ใช้งาน',
  past_due: 'เลยรอบจ่าย',
  canceled: 'ยกเลิกแล้ว',
};

const baht = (satang: number): string =>
  (satang / 100).toLocaleString('th-TH', { maximumFractionDigits: 0 });

function UsageRow({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}): React.JSX.Element {
  const full = limit !== null && used >= limit;
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-semibold ${full ? 'text-rose-600' : 'text-slate-800'}`}>
        {used}
        {limit === null ? ' (ไม่จำกัด)' : ` / ${limit}`}
      </span>
    </div>
  );
}

export function ManageSubscription(): React.JSX.Element {
  const [data, setData] = useState<SubscriptionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription()
      .then(setData)
      .catch(() => setError('โหลดข้อมูลแพ็กเกจไม่สำเร็จ'));
  }, []);

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-slate-400">กำลังโหลด...</p>;
  }

  const planFeatures = data.plan?.features ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      {/* แพ็กเกจปัจจุบัน */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">แพ็กเกจปัจจุบัน</p>
            <p className="text-2xl font-bold">{data.plan?.name ?? 'ฟรี'}</p>
            {data.plan && data.plan.priceMonthly > 0 && (
              <p className="text-sm text-slate-500">
                {baht(data.plan.priceMonthly)} บาท / เดือน
              </p>
            )}
          </div>
          {data.subscriptionStatus && (
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
              {STATUS_LABELS[data.subscriptionStatus] ?? data.subscriptionStatus}
            </span>
          )}
        </div>
        {data.currentPeriodEnd && (
          <p className="mt-3 text-sm text-slate-500">
            หมดรอบ:{' '}
            {new Date(data.currentPeriodEnd).toLocaleDateString('th-TH', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
        <p className="mt-3 text-xs text-slate-400">
          ต้องการเปลี่ยนแพ็กเกจ ติดต่อผู้ดูแลระบบ
        </p>
      </section>

      {/* โควต้าการใช้งาน */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="mb-3 text-base font-bold">โควต้าการใช้งาน</h3>
        <div className="space-y-2">
          <UsageRow label="พนักงาน" used={data.usage.staff} limit={data.plan?.maxStaff ?? null} />
          <UsageRow label="โต๊ะ" used={data.usage.table} limit={data.plan?.maxTable ?? null} />
          <UsageRow label="เมนู" used={data.usage.menu} limit={data.plan?.maxMenu ?? null} />
        </div>
      </section>

      {/* ฟีเจอร์ */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="mb-3 text-base font-bold">ฟีเจอร์</h3>
        <ul className="space-y-2">
          {FEATURE_LABELS.map((f) => {
            const on = planFeatures.includes(f.key);
            return (
              <li key={f.key} className="flex items-center gap-2 text-sm">
                <span className={on ? 'text-emerald-600' : 'text-slate-300'}>
                  {on ? '✓' : '✕'}
                </span>
                <span className={on ? 'text-slate-700' : 'text-slate-400'}>
                  {f.label}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
