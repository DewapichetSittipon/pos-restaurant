import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { fetchShop, updateShop } from '../../services/manageApi';

function errMsg(err: unknown, fallback: string): string {
  return axios.isAxiosError(err) && err.response?.data?.message
    ? String(err.response.data.message)
    : fallback;
}

interface Form {
  name: string;
  address: string;
  phone: string;
  taxId: string;
  promptpayId: string;
  vatPercent: string; // อัตรา VAT เป็น % (แปลงเป็น basis points ตอนบันทึก)
  vatInclusive: boolean;
  serviceChargePercent: string; // เซอร์วิสชาร์จ เป็น %
  loyaltyEarnRate: string; // แต้มต่อ 100 บาท
}

const EMPTY: Form = {
  name: '',
  address: '',
  phone: '',
  taxId: '',
  promptpayId: '',
  vatPercent: '',
  vatInclusive: true,
  serviceChargePercent: '',
  loyaltyEarnRate: '',
};

// % (ข้อความ) -> basis points; ว่าง/ไม่ใช่ตัวเลข = 0
function percentToBp(percent: string): number {
  const n = parseFloat(percent);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

// basis points -> % (ข้อความ); 0 = ว่าง
function bpToPercent(bp: number): string {
  return bp > 0 ? String(bp / 100) : '';
}

export function ManageShop() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    fetchShop()
      .then((s) =>
        setForm({
          name: s.name,
          address: s.address ?? '',
          phone: s.phone ?? '',
          taxId: s.taxId ?? '',
          promptpayId: s.promptpayId ?? '',
          vatPercent: bpToPercent(s.vatRate),
          vatInclusive: s.vatInclusive,
          serviceChargePercent: bpToPercent(s.serviceChargeRate),
          loyaltyEarnRate: s.loyaltyEarnRate > 0 ? String(s.loyaltyEarnRate) : '',
        }),
      )
      .catch(() => setError('โหลดข้อมูลร้านไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => reload(), [reload]);

  function set<K extends keyof Form>(key: K, value: Form[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('กรุณากรอกชื่อร้าน');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateShop({
        name: form.name,
        address: form.address,
        phone: form.phone,
        taxId: form.taxId,
        promptpayId: form.promptpayId,
        vatRate: percentToBp(form.vatPercent),
        vatInclusive: form.vatInclusive,
        serviceChargeRate: percentToBp(form.serviceChargePercent),
        loyaltyEarnRate: Math.max(0, parseInt(form.loyaltyEarnRate, 10) || 0),
      });
      setSaved(true);
    } catch (err) {
      setError(errMsg(err, 'บันทึกไม่สำเร็จ'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-400">กำลังโหลด...</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base font-bold">ข้อมูลร้าน (หัวใบเสร็จ)</h2>
      <p className="mb-4 text-xs text-slate-400">
        ข้อมูลนี้จะแสดงบนหัวใบเสร็จตอนเช็คบิล — เว้นว่างได้ ช่องที่ว่างจะไม่พิมพ์
      </p>

      <form onSubmit={save} className="space-y-3">
        <Field label="ชื่อร้าน *">
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="เช่น ร้านอาหารตามสั่ง A"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Field>

        <Field label="ที่อยู่">
          <textarea
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="123 ถ.สุขุมวิท แขวง... เขต... กรุงเทพฯ 10110"
            rows={2}
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Field>

        <Field label="เบอร์โทร">
          <input
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="02-123-4567"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Field>

        <Field label="เลขประจำตัวผู้เสียภาษี">
          <input
            value={form.taxId}
            onChange={(e) => set('taxId', e.target.value)}
            placeholder="0-0000-00000-00-0 (ถ้ามี)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Field>

        <Field label="PromptPay (รับโอน — สร้าง QR บนใบเสร็จ)">
          <input
            value={form.promptpayId}
            onChange={(e) => set('promptpayId', e.target.value)}
            placeholder="เบอร์มือถือ หรือ เลขบัตรประชาชน"
            inputMode="numeric"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </Field>

        <div className="border-t border-slate-100 pt-3">
          <h3 className="text-sm font-bold text-slate-700">ภาษี & เซอร์วิสชาร์จ</h3>
          <p className="mt-0.5 mb-3 text-xs text-slate-400">
            กรอกเป็นเปอร์เซ็นต์ — เว้นว่างหรือ 0 = ไม่คิด คิดตอนเช็คบิลและแสดงบนใบเสร็จ
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="VAT (%)">
              <input
                value={form.vatPercent}
                onChange={(e) => set('vatPercent', e.target.value)}
                placeholder="เช่น 7"
                type="number"
                inputMode="decimal"
                min={0}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              />
            </Field>

            <Field label="เซอร์วิสชาร์จ (%)">
              <input
                value={form.serviceChargePercent}
                onChange={(e) => set('serviceChargePercent', e.target.value)}
                placeholder="เช่น 10"
                type="number"
                inputMode="decimal"
                min={0}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
              />
            </Field>
          </div>

          <label className="mt-3 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.vatInclusive}
              onChange={(e) => set('vatInclusive', e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span className="text-slate-600">
              ราคาเมนูรวม VAT แล้ว
              <span className="block text-xs text-slate-400">
                เลือก = ใบเสร็จถอด VAT ออกมาแสดง (ยอดรวมไม่เพิ่ม) · ไม่เลือก = บวก VAT
                เพิ่มจากยอด
              </span>
            </span>
          </label>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <h3 className="text-sm font-bold text-slate-700">สมาชิก / แต้มสะสม</h3>
          <p className="mt-0.5 mb-3 text-xs text-slate-400">
            แต้มที่ลูกค้าได้รับต่อยอด 100 บาท — เว้นว่างหรือ 0 = ปิดระบบสมาชิก · แลกแต้ม 1
            แต้ม = 1 บาทเสมอ
          </p>
          <Field label="แต้มต่อ 100 บาท">
            <input
              value={form.loyaltyEarnRate}
              onChange={(e) => set('loyaltyEarnRate', e.target.value)}
              placeholder="เช่น 1"
              type="number"
              inputMode="numeric"
              min={0}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
            />
          </Field>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          {saved && <span className="text-sm font-medium text-emerald-600">บันทึกแล้ว ✓</span>}
        </div>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
