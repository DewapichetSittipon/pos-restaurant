import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { logout } from '../services/staffApi';
import { useStaffStore } from '../store/staffStore';
import {
  fetchOnboarding,
  submitOnboarding,
  type OnboardingStatus,
} from '../services/onboardingApi';
import { formatBaht } from '../utils/money';
import { promptpayPayload } from '../utils/promptpay';

// หน้าร้าน pending: เลือกแพ็กเกจ → โอนเงิน (QR) → แนบสลิป → ส่งให้ admin อนุมัติ
export function PendingApprovalPage() {
  const navigate = useNavigate();
  const staff = useStaffStore((s) => s.staff);
  const setStaff = useStaffStore((s) => s.setStaff);

  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [slip, setSlip] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOnboarding()
      .then(setStatus)
      .catch(() => setError('โหลดข้อมูลแพ็กเกจไม่สำเร็จ'));
  }, []);

  async function handleLogout(): Promise<void> {
    await logout();
    setStaff(null);
    navigate('/login', { replace: true });
  }

  async function handleSubmit(): Promise<void> {
    if (!selectedKey || !slip) return;
    setBusy(true);
    setError(null);
    try {
      setStatus(await submitOnboarding(selectedKey, slip));
      setSlip(null);
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

  const selectedPlan = status?.plans.find((p) => p.key === selectedKey) ?? null;
  // ส่งสลิปแล้ว รอ admin ตรวจ (มีแพ็กเกจที่เลือก + สลิป)
  const submitted = !!status?.requestedPlanKey && !!status?.paymentSlipUrl;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold">ตั้งค่าร้าน</h1>
          <p className="text-sm text-slate-500">{staff?.username}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700"
        >
          ออกจากระบบ
        </button>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-8">
        {!status ? (
          <p className="text-center text-sm text-slate-400">กำลังโหลด...</p>
        ) : submitted ? (
          <SubmittedCard
            status={status}
            onEdit={() =>
              setStatus({
                ...status,
                requestedPlanKey: null,
                paymentSlipUrl: null,
              })
            }
          />
        ) : (
          <div className="space-y-6">
            {/* ขั้น 1: เลือกแพ็กเกจ */}
            <section>
              <h2 className="mb-1 text-base font-bold">1. เลือกแพ็กเกจ</h2>
              <p className="mb-3 text-xs text-slate-400">
                เลือกแพ็กเกจที่ต้องการ แล้วชำระเงินเพื่อเริ่มใช้งาน
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {status.plans.map((p) => {
                  const active = p.key === selectedKey;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setSelectedKey(p.key)}
                      className={`rounded-2xl border-2 p-4 text-left ${
                        active
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <p className="font-bold">{p.name}</p>
                      <p className="text-sm text-slate-500">
                        {formatBaht(p.priceMonthly)} / เดือน
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        พนักงาน {p.maxStaff ?? 'ไม่จำกัด'} · โต๊ะ{' '}
                        {p.maxTable ?? 'ไม่จำกัด'} · เมนู {p.maxMenu ?? 'ไม่จำกัด'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ขั้น 2: ชำระเงิน */}
            {selectedPlan && (
              <section className="rounded-2xl bg-white p-5">
                <h2 className="mb-3 text-base font-bold">
                  2. โอนเงิน {formatBaht(selectedPlan.priceMonthly)}
                </h2>
                {status.platformPromptPay ? (
                  <div className="flex flex-col items-center gap-2">
                    <QRCodeSVG
                      value={promptpayPayload(
                        status.platformPromptPay,
                        selectedPlan.priceMonthly,
                      )}
                      size={180}
                    />
                    <p className="text-sm text-slate-500">
                      สแกนจ่ายผ่านแอปธนาคาร (PromptPay)
                    </p>
                  </div>
                ) : (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    ยังไม่ได้ตั้งค่าช่องทางชำระเงิน — กรุณาติดต่อผู้ดูแลระบบ
                  </p>
                )}
              </section>
            )}

            {/* ขั้น 3: แนบสลิป */}
            {selectedPlan && (
              <section className="rounded-2xl bg-white p-5">
                <h2 className="mb-3 text-base font-bold">3. แนบสลิปการโอน</h2>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setSlip(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold"
                />
                {slip && (
                  <img
                    src={URL.createObjectURL(slip)}
                    alt="สลิป"
                    className="mt-3 max-h-48 rounded-lg border border-slate-200"
                  />
                )}
              </section>
            )}

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedKey || !slip || busy}
              className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white disabled:opacity-40"
            >
              {busy ? 'กำลังส่ง...' : 'ส่งให้ผู้ดูแลตรวจสอบ'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// การ์ดหลังส่งสลิปแล้ว — รอ admin อนุมัติ
function SubmittedCard({
  status,
  onEdit,
}: {
  status: OnboardingStatus;
  onEdit: () => void;
}): React.JSX.Element {
  const plan = status.plans.find((p) => p.key === status.requestedPlanKey);
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-8 text-center">
      <div className="text-5xl">⏳</div>
      <h2 className="text-xl font-bold">ส่งคำขอแล้ว รอตรวจสอบ</h2>
      <p className="text-sm text-slate-600">
        คุณเลือกแพ็กเกจ <b>{plan?.name ?? status.requestedPlanKey}</b> และแนบสลิปแล้ว
        — ผู้ดูแลระบบกำลังตรวจสอบการชำระเงิน เมื่ออนุมัติแล้วเข้าใช้งานได้ทันที
        (ลองเข้าสู่ระบบใหม่ภายหลัง)
      </p>
      {status.paymentSlipUrl && (
        <img
          src={status.paymentSlipUrl}
          alt="สลิป"
          className="mx-auto max-h-48 rounded-lg border border-slate-200"
        />
      )}
      <button
        type="button"
        onClick={onEdit}
        className="text-sm font-semibold text-indigo-600"
      >
        เลือกแพ็กเกจ/แนบสลิปใหม่
      </button>
    </div>
  );
}
