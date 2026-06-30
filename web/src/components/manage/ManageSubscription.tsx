import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  cancelPlanRequest,
  fetchSubscription,
  requestPlanUpgrade,
} from '../../services/manageApi';
import type { PlanView, SubscriptionSummary } from '../../type/manage';

// feature key (ตรงกับ backend common/plan-access.ts) -> ป้ายภาษาไทย + ลำดับแสดง
const FEATURE_LABELS: { key: string; label: string }[] = [
  { key: 'report_history', label: 'รายงานย้อนหลัง + export' },
  { key: 'promotions', label: 'โปรโมชั่น (happy hour / BOGO)' },
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

// คำโปรย/ตำแหน่งของแต่ละ tier (อิง Plan.key)
const PLAN_TAGLINE: Record<string, string> = {
  free: 'เริ่มต้นใช้งาน ร้านเล็ก',
  pro: 'ครบทุกฟีเจอร์ ร้านเดียว',
  business: 'หลายสาขา ไม่จำกัด',
};

const baht = (satang: number): string =>
  (satang / 100).toLocaleString('th-TH', { maximumFractionDigits: 0 });

const limitText = (n: number | null): string =>
  n === null ? 'ไม่จำกัด' : String(n);

interface PlanCardProps {
  plan: PlanView;
  isCurrent: boolean;
  isRecommended: boolean;
  requestedKey: string | null;
  busy: boolean;
  onRequest: (key: string) => void;
}

function PlanCard({
  plan,
  isCurrent,
  isRecommended,
  requestedKey,
  busy,
  onRequest,
}: PlanCardProps): React.JSX.Element {
  const isRequested = requestedKey === plan.key;
  const hasPending = requestedKey !== null;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-5 ${
        isCurrent
          ? 'border-indigo-500 ring-2 ring-indigo-500'
          : isRecommended
            ? 'border-indigo-200'
            : 'border-slate-200'
      }`}
    >
      {isRecommended && !isCurrent && (
        <span className="absolute -top-2.5 left-5 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white">
          แนะนำ
        </span>
      )}

      {/* หัวการ์ด */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold">{plan.name}</h4>
          {isCurrent && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              ใช้อยู่
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-400">
          {PLAN_TAGLINE[plan.key] ?? ''}
        </p>
        <p className="mt-2">
          {plan.priceMonthly > 0 ? (
            <>
              <span className="text-2xl font-bold">
                {baht(plan.priceMonthly)}
              </span>
              <span className="text-sm text-slate-500"> บาท / เดือน</span>
            </>
          ) : (
            <span className="text-2xl font-bold">ฟรี</span>
          )}
        </p>
      </div>

      {/* เพดาน resource */}
      <dl className="space-y-1.5 py-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">พนักงาน</dt>
          <dd className="font-semibold">{limitText(plan.maxStaff)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">โต๊ะ</dt>
          <dd className="font-semibold">{limitText(plan.maxTable)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">เมนู</dt>
          <dd className="font-semibold">{limitText(plan.maxMenu)}</dd>
        </div>
      </dl>

      {/* ฟีเจอร์ */}
      <ul className="space-y-1.5 border-t border-slate-100 py-4 text-sm">
        {FEATURE_LABELS.map((f) => {
          const on = plan.features.includes(f.key);
          return (
            <li key={f.key} className="flex items-start gap-2">
              <span
                className={`mt-0.5 shrink-0 ${on ? 'text-emerald-600' : 'text-slate-300'}`}
              >
                {on ? '✓' : '✕'}
              </span>
              <span className={on ? 'text-slate-700' : 'text-slate-400'}>
                {f.label}
              </span>
            </li>
          );
        })}
      </ul>

      {/* ปุ่ม */}
      <div className="mt-auto pt-2">
        {isCurrent ? (
          <button
            type="button"
            disabled
            className="w-full rounded-lg bg-slate-100 py-2.5 text-sm font-semibold text-slate-400"
          >
            แพ็กเกจปัจจุบัน
          </button>
        ) : isRequested ? (
          <button
            type="button"
            disabled
            className="w-full rounded-lg bg-amber-100 py-2.5 text-sm font-semibold text-amber-700"
          >
            รออนุมัติ
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRequest(plan.key)}
            disabled={busy || hasPending}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {plan.priceMonthly > 0 ? 'ขอเปลี่ยนเป็นแพ็กเกจนี้' : 'ขอใช้แพ็กเกจนี้'}
          </button>
        )}
      </div>
    </div>
  );
}

// แถบโควต้าพร้อมบาร์ความคืบหน้า
function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}): React.JSX.Element {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const full = limit !== null && used >= limit;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className={`font-semibold ${full ? 'text-rose-600' : 'text-slate-700'}`}>
          {used}
          {limit === null ? (
            <span className="font-normal text-slate-400"> / ไม่จำกัด</span>
          ) : (
            ` / ${limit}`
          )}
        </span>
      </div>
      {limit !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${full ? 'bg-rose-500' : 'bg-indigo-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function ManageSubscription(): React.JSX.Element {
  const [data, setData] = useState<SubscriptionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchSubscription()
      .then(setData)
      .catch(() => setError('โหลดข้อมูลแพ็กเกจไม่สำเร็จ'));
  }, []);

  async function handleRequest(planKey: string): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      setData(await requestPlanUpgrade(planKey));
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'ส่งคำขอไม่สำเร็จ',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelRequest(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      setData(await cancelPlanRequest());
    } catch {
      setError('ยกเลิกคำขอไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-slate-400">กำลังโหลด...</p>;
  }

  const currentKey = data.plan?.key ?? 'free';
  const requestedPlan = data.requestedPlanKey
    ? data.availablePlans.find((p) => p.key === data.requestedPlanKey)
    : null;

  return (
    <div className="max-w-5xl space-y-6">
      {/* แถบสรุปแพ็กเกจปัจจุบัน */}
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">แพ็กเกจปัจจุบัน</p>
          <p className="text-2xl font-bold">
            {data.plan?.name ?? 'ฟรี'}
            {data.subscriptionStatus && (
              <span className="ml-2 align-middle rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                {STATUS_LABELS[data.subscriptionStatus] ?? data.subscriptionStatus}
              </span>
            )}
          </p>
          {data.currentPeriodEnd && (
            <p className="mt-1 text-sm text-slate-500">
              ใช้ได้ถึง{' '}
              {new Date(data.currentPeriodEnd).toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
        {/* โควต้าแบบย่อ */}
        <div className="grid w-full max-w-xs gap-2.5">
          <UsageBar label="พนักงาน" used={data.usage.staff} limit={data.plan?.maxStaff ?? null} />
          <UsageBar label="โต๊ะ" used={data.usage.table} limit={data.plan?.maxTable ?? null} />
          <UsageBar label="เมนู" used={data.usage.menu} limit={data.plan?.maxMenu ?? null} />
        </div>
      </section>

      {/* คำขออัปเกรดที่รออนุมัติ */}
      {data.requestedPlanKey && (
        <div className="flex flex-col gap-3 rounded-xl bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-800">
            ส่งคำขอเปลี่ยนเป็น <b>{requestedPlan?.name ?? data.requestedPlanKey}</b>{' '}
            แล้ว — โอนชำระเงินแล้วรอผู้ดูแลระบบยืนยัน
          </p>
          <button
            type="button"
            onClick={handleCancelRequest}
            disabled={busy}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 disabled:opacity-50"
          >
            ยกเลิกคำขอ
          </button>
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {/* ตารางเทียบแพ็กเกจ */}
      <section>
        <div className="mb-3">
          <h3 className="text-base font-bold">เลือกแพ็กเกจ</h3>
          <p className="text-xs text-slate-400">
            กดขอเปลี่ยนแพ็กเกจ แล้วโอนชำระเงิน — ผู้ดูแลระบบจะเปิดให้หลังตรวจสอบ
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {data.availablePlans.map((p) => (
            <PlanCard
              key={p.key}
              plan={p}
              isCurrent={p.key === currentKey}
              isRecommended={p.key === 'pro'}
              requestedKey={data.requestedPlanKey}
              busy={busy}
              onRequest={handleRequest}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
