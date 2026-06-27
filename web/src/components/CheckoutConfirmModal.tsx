import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { formatBaht } from '../utils/money';
import { promptpayPayload } from '../utils/promptpay';
import { computeBillTotals, type BillCharges } from '../utils/billMath';
import { createMember, lookupMember } from '../services/staffApi';
import type { CheckoutPayload, Member } from '../type/staff';

interface CheckoutConfirmModalProps {
  tableNumber: string;
  subtotal: number; // สตางค์ ยอดก่อนหักส่วนลด
  charges: BillCharges; // อัตรา VAT/เซอร์วิสชาร์จของร้าน
  loyaltyEarnRate: number; // แต้มต่อ 100 บาท (0 = ปิดระบบสมาชิก)
  promptpayId: string | null; // PromptPay ของร้าน (null = ไม่มี → ไม่โชว์ QR)
  busy: boolean;
  deliveryFee?: number; // สตางค์ ค่าส่ง (เดลิเวอรี) — บวกท้ายยอดสุทธิ
  label?: string; // ป้ายหัวข้อแทน "โต๊ะ X" (เช่น "กลับบ้าน")
  onConfirm: (payload: CheckoutPayload) => void;
  onCancel: () => void;
}

// แปลงข้อความบาท -> สตางค์ (ว่าง/ไม่ใช่ตัวเลข = 0)
function toSatang(baht: string): number {
  const n = parseFloat(baht);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

export function CheckoutConfirmModal({
  tableNumber,
  subtotal,
  charges,
  loyaltyEarnRate,
  promptpayId,
  busy,
  deliveryFee = 0,
  label,
  onConfirm,
  onCancel,
}: CheckoutConfirmModalProps) {
  const [discountInput, setDiscountInput] = useState('');
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash');
  const [receivedInput, setReceivedInput] = useState('');

  // สมาชิก/แต้ม
  const [phoneInput, setPhoneInput] = useState('');
  const [member, setMember] = useState<Member | null>(null);
  const [memberMsg, setMemberMsg] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [redeemInput, setRedeemInput] = useState('');

  const manualDiscount = Math.min(toSatang(discountInput), subtotal);
  // แลกแต้มได้ไม่เกิน: แต้มคงเหลือ + ยอดที่เหลือหลังหักส่วนลด
  const maxRedeem = member
    ? Math.min(member.points, Math.floor((subtotal - manualDiscount) / 100))
    : 0;
  const redeemPoints = member
    ? Math.min(Math.max(parseInt(redeemInput, 10) || 0, 0), maxRedeem)
    : 0;

  const totals = useMemo(
    () =>
      computeBillTotals(
        subtotal,
        manualDiscount + redeemPoints * 100,
        charges,
      ),
    [subtotal, manualDiscount, redeemPoints, charges],
  );
  const { serviceCharge, vatAmount, total } = totals;
  // ยอดที่ต้องจ่ายจริง = ยอดสุทธิอาหาร + ค่าส่ง (แต้มคิดจากยอดอาหารเท่านั้น)
  const grandTotal = total + deliveryFee;
  const pointsToEarn =
    member && loyaltyEarnRate > 0
      ? Math.floor(total / 10000) * loyaltyEarnRate
      : 0;

  async function handleLookup(): Promise<void> {
    const phone = phoneInput.trim();
    if (!phone) return;
    setLookingUp(true);
    setMemberMsg(null);
    try {
      const found = await lookupMember(phone);
      if (found) {
        setMember(found);
      } else {
        // ไม่พบ → สมัครสมาชิกใหม่ด้วยเบอร์นี้
        const created = await createMember(phone);
        setMember(created);
        setMemberMsg('สมัครสมาชิกใหม่แล้ว');
      }
    } catch {
      setMemberMsg('ค้นหา/สมัครสมาชิกไม่สำเร็จ');
    } finally {
      setLookingUp(false);
    }
  }
  const vatPercentLabel = (charges.vatRate / 100).toLocaleString('th-TH');
  const servicePercentLabel = (charges.serviceChargeRate / 100).toLocaleString(
    'th-TH',
  );
  const received = toSatang(receivedInput);
  const change = useMemo(
    () => (method === 'cash' && received > 0 ? received - grandTotal : null),
    [method, received, grandTotal],
  );

  function handleConfirm(): void {
    onConfirm({
      // ส่งส่วนลดปกติ (ไม่รวมแต้ม) — backend คิดแต้มเอง
      discount: manualDiscount > 0 ? manualDiscount : undefined,
      paymentMethod: method,
      receivedAmount: method === 'cash' && received > 0 ? received : undefined,
      memberId: member?.id,
      redeemPoints: redeemPoints > 0 ? redeemPoints : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={busy ? undefined : onCancel}
      />
      <div className="relative w-full max-w-xs rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-center text-lg font-bold">
          {label ? `เช็คบิล ${label}` : `เช็คบิล โต๊ะ ${tableNumber}`}
        </h2>

        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>ยอดรวม</span>
            <span>{formatBaht(subtotal)}</span>
          </div>
          <label className="flex items-center justify-between gap-2">
            <span className="text-slate-500">ส่วนลด</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={discountInput}
              onChange={(e) => setDiscountInput(e.target.value)}
              placeholder="0"
              className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right"
            />
          </label>
          {redeemPoints > 0 && (
            <div className="flex justify-between text-amber-600">
              <span>แลกแต้ม {redeemPoints} แต้ม</span>
              <span>-{formatBaht(redeemPoints * 100)}</span>
            </div>
          )}
          {serviceCharge > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>เซอร์วิสชาร์จ {servicePercentLabel}%</span>
              <span>{formatBaht(serviceCharge)}</span>
            </div>
          )}
          {charges.vatRate > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>
                VAT {vatPercentLabel}%
                {charges.vatInclusive ? ' (รวมแล้ว)' : ''}
              </span>
              <span>{formatBaht(vatAmount)}</span>
            </div>
          )}
          {deliveryFee > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>ค่าส่ง</span>
              <span>{formatBaht(deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
            <span>สุทธิ</span>
            <span>{formatBaht(grandTotal)}</span>
          </div>
        </div>

        {/* สมาชิก/แต้มสะสม (เฉพาะร้านที่เปิดระบบ) */}
        {loyaltyEarnRate > 0 && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">
            {!member ? (
              <div className="flex gap-2">
                <input
                  type="tel"
                  inputMode="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="เบอร์สมาชิก"
                  className="min-w-0 flex-1 rounded-lg border border-amber-200 px-2.5 py-1.5"
                />
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={lookingUp || !phoneInput.trim()}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-white disabled:opacity-50"
                >
                  {lookingUp ? '...' : 'ค้นหา'}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-800">
                    👤 {member.name || member.phone}
                  </span>
                  <span className="text-amber-700">{member.points} แต้ม</span>
                </div>
                {maxRedeem > 0 && (
                  <label className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-slate-500">
                      แลกแต้ม (สูงสุด {maxRedeem})
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={maxRedeem}
                      value={redeemInput}
                      onChange={(e) => setRedeemInput(e.target.value)}
                      placeholder="0"
                      className="w-20 rounded-lg border border-amber-200 px-2 py-1.5 text-right"
                    />
                  </label>
                )}
                <div className="mt-1 flex items-center justify-between text-xs text-amber-600">
                  <span>จะได้รับ +{pointsToEarn} แต้ม</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMember(null);
                      setRedeemInput('');
                      setPhoneInput('');
                    }}
                    className="font-medium underline"
                  >
                    เปลี่ยน
                  </button>
                </div>
              </>
            )}
            {memberMsg && (
              <p className="mt-1 text-xs text-amber-700">{memberMsg}</p>
            )}
          </div>
        )}

        {/* วิธีชำระ */}
        <div className="mt-4 flex gap-2">
          {(['cash', 'transfer'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                method === m
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {m === 'cash' ? '💵 เงินสด' : '🏦 โอน'}
            </button>
          ))}
        </div>

        {/* รับเงิน + ทอน (เงินสด) */}
        {method === 'cash' && (
          <div className="mt-3 space-y-2 text-sm">
            <label className="flex items-center justify-between gap-2">
              <span className="text-slate-500">รับเงิน</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={receivedInput}
                onChange={(e) => setReceivedInput(e.target.value)}
                placeholder="0"
                className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-right"
              />
            </label>
            {change !== null && (
              <div
                className={`flex justify-between font-semibold ${
                  change < 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                <span>{change < 0 ? 'เงินขาด' : 'เงินทอน'}</span>
                <span>{formatBaht(Math.abs(change))}</span>
              </div>
            )}
          </div>
        )}

        {/* PromptPay QR (โอน) — ลูกค้าสแกนจ่ายยอดสุทธิ */}
        {method === 'transfer' &&
          (promptpayId && grandTotal > 0 ? (
            <div className="mt-3 flex flex-col items-center rounded-xl bg-slate-50 py-3">
              <QRCodeSVG value={promptpayPayload(promptpayId, grandTotal)} size={160} />
              <p className="mt-2 text-xs text-slate-500">
                สแกนจ่าย {formatBaht(grandTotal)} · PromptPay
              </p>
            </div>
          ) : (
            <p className="mt-3 text-center text-xs text-slate-400">
              {promptpayId
                ? ''
                : 'ตั้งค่า PromptPay ในข้อมูลร้านเพื่อแสดง QR'}
            </p>
          ))}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-lg bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? 'กำลังเช็คบิล...' : 'ยืนยัน & พิมพ์'}
          </button>
        </div>
      </div>
    </div>
  );
}
