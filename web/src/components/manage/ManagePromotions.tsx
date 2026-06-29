import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  createPromotion,
  deletePromotion,
  fetchPromotions,
  updatePromotion,
} from '../../services/staffApi';
import type { Promotion, PromotionInput, PromotionType } from '../../type/staff';
import { formatBaht } from '../../utils/money';

function errMsg(err: unknown, fallback: string): string {
  return axios.isAxiosError(err) && err.response?.data?.message
    ? String(err.response.data.message)
    : fallback;
}

const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']; // bit0=อาทิตย์ … bit6=เสาร์
const ALL_DAYS = 127;

// นาทีจากเที่ยงคืน <-> "HH:MM" (ว่าง = ทั้งวัน)
function minToTime(m: number | null): string {
  if (m == null) return '';
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function timeToMin(t: string): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}
function toSatang(baht: string): number {
  const n = parseFloat(baht);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

// state ของฟอร์ม (เก็บเป็น string เพื่อพิมพ์ง่าย แปลงตอน submit)
interface FormState {
  name: string;
  type: PromotionType;
  percent: string; // % (เฉพาะ percent)
  amount: string; // บาท (เฉพาะ amount)
  maxDiscount: string; // บาท (เฉพาะ percent)
  buyQty: string;
  getQty: string;
  minSubtotal: string; // บาท
  start: string; // HH:MM
  end: string; // HH:MM
  daysOfWeek: number;
  membersOnly: boolean;
  birthdayOnly: boolean;
  isActive: boolean;
}

const EMPTY: FormState = {
  name: '',
  type: 'percent',
  percent: '',
  amount: '',
  maxDiscount: '',
  buyQty: '1',
  getQty: '1',
  minSubtotal: '',
  start: '',
  end: '',
  daysOfWeek: ALL_DAYS,
  membersOnly: false,
  birthdayOnly: false,
  isActive: true,
};

function toForm(p: Promotion): FormState {
  return {
    name: p.name,
    type: p.type,
    percent: p.type === 'percent' ? String(p.value / 100) : '',
    amount: p.type === 'amount' ? String(p.value / 100) : '',
    maxDiscount: p.maxDiscount != null ? String(p.maxDiscount / 100) : '',
    buyQty: String(p.buyQty || 1),
    getQty: String(p.getQty || 1),
    minSubtotal: p.minSubtotal ? String(p.minSubtotal / 100) : '',
    start: minToTime(p.startMinute),
    end: minToTime(p.endMinute),
    daysOfWeek: p.daysOfWeek,
    membersOnly: p.membersOnly,
    birthdayOnly: p.birthdayOnly,
    isActive: p.isActive,
  };
}

function toInput(f: FormState): PromotionInput {
  return {
    name: f.name.trim(),
    type: f.type,
    value:
      f.type === 'percent'
        ? Math.round((parseFloat(f.percent) || 0) * 100) // % → basis points
        : f.type === 'amount'
          ? toSatang(f.amount)
          : 0,
    minSubtotal: toSatang(f.minSubtotal),
    maxDiscount:
      f.type === 'percent' && f.maxDiscount ? toSatang(f.maxDiscount) : null,
    startMinute: timeToMin(f.start),
    endMinute: timeToMin(f.end),
    daysOfWeek: f.daysOfWeek,
    buyQty: f.type === 'bogo' ? Math.max(parseInt(f.buyQty, 10) || 0, 0) : 0,
    getQty: f.type === 'bogo' ? Math.max(parseInt(f.getQty, 10) || 0, 0) : 0,
    membersOnly: f.membersOnly,
    birthdayOnly: f.birthdayOnly,
    isActive: f.isActive,
    priority: 0,
  };
}

// สรุปเงื่อนไขเป็นข้อความสั้น ๆ ในรายการ
function summary(p: Promotion): string {
  const parts: string[] = [];
  if (p.type === 'percent')
    parts.push(`ลด ${p.value / 100}%${p.maxDiscount ? ` (สูงสุด ${formatBaht(p.maxDiscount)})` : ''}`);
  else if (p.type === 'amount') parts.push(`ลด ${formatBaht(p.value)}`);
  else parts.push(`ซื้อ ${p.buyQty} แถม ${p.getQty}`);
  if (p.minSubtotal) parts.push(`ยอดขั้นต่ำ ${formatBaht(p.minSubtotal)}`);
  if (p.startMinute != null && p.endMinute != null)
    parts.push(`${minToTime(p.startMinute)}–${minToTime(p.endMinute)}`);
  if (p.daysOfWeek !== ALL_DAYS) {
    const days = DAY_LABELS.filter((_, i) => (p.daysOfWeek & (1 << i)) !== 0);
    parts.push(days.join(','));
  }
  if (p.birthdayOnly) parts.push('🎂 วันเกิด');
  else if (p.membersOnly) parts.push('สมาชิก');
  return parts.join(' · ');
}

export function ManagePromotions() {
  const [list, setList] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload(): void {
    fetchPromotions()
      .then(setList)
      .catch(() => setError('โหลดโปรโมชันไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }
  useEffect(reload, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function toggleDay(i: number): void {
    setForm((f) => ({ ...f, daysOfWeek: f.daysOfWeek ^ (1 << i) }));
  }
  function startEdit(p: Promotion): void {
    setEditingId(p.id);
    setForm(toForm(p));
    setError(null);
  }
  function resetForm(): void {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('กรอกชื่อโปรโมชัน');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const input = toInput(form);
      if (editingId) await updatePromotion(editingId, input);
      else await createPromotion(input);
      resetForm();
      reload();
    } catch (err) {
      setError(errMsg(err, 'บันทึกไม่สำเร็จ'));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(p: Promotion): Promise<void> {
    try {
      await updatePromotion(p.id, { isActive: !p.isActive });
      reload();
    } catch {
      setError('อัปเดตสถานะไม่สำเร็จ');
    }
  }

  async function remove(p: Promotion): Promise<void> {
    if (!confirm(`ลบโปร "${p.name}" ?`)) return;
    try {
      await deletePromotion(p.id);
      if (editingId === p.id) resetForm();
      reload();
    } catch {
      setError('ลบไม่สำเร็จ');
    }
  }

  const inputCls = 'rounded-lg border border-slate-300 px-3 py-2 text-sm';

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base font-bold">โปรโมชัน</h2>
      <p className="mb-4 text-xs text-slate-400">
        ตั้งกฎส่วนลดอัตโนมัติ — happy hour, ซื้อแถม, ราคาสมาชิก, โปรวันเกิด ·
        พนักงานเลือกใช้ตอนเช็คบิล
      </p>

      {/* ฟอร์มสร้าง/แก้ */}
      <form
        onSubmit={submit}
        className="mb-6 space-y-3 rounded-xl border border-slate-200 p-4"
      >
        <div className="flex flex-wrap gap-2">
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="ชื่อโปร เช่น ลด 10% มื้อเที่ยง"
            className={`${inputCls} flex-1`}
          />
          <select
            value={form.type}
            onChange={(e) => set('type', e.target.value as PromotionType)}
            className={inputCls}
          >
            <option value="percent">ลดเป็น %</option>
            <option value="amount">ลดเป็นบาท</option>
            <option value="bogo">ซื้อ X แถม Y</option>
          </select>
        </div>

        {/* ค่าตามชนิดโปร */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {form.type === 'percent' && (
            <>
              <label className="flex items-center gap-1">
                ลด
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.percent}
                  onChange={(e) => set('percent', e.target.value)}
                  className={`${inputCls} w-20 text-right`}
                />
                %
              </label>
              <label className="flex items-center gap-1 text-slate-500">
                สูงสุด
                <input
                  type="number"
                  min={0}
                  value={form.maxDiscount}
                  onChange={(e) => set('maxDiscount', e.target.value)}
                  placeholder="ไม่จำกัด"
                  className={`${inputCls} w-24 text-right`}
                />
                บาท
              </label>
            </>
          )}
          {form.type === 'amount' && (
            <label className="flex items-center gap-1">
              ลด
              <input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                className={`${inputCls} w-24 text-right`}
              />
              บาท
            </label>
          )}
          {form.type === 'bogo' && (
            <>
              <label className="flex items-center gap-1">
                ซื้อ
                <input
                  type="number"
                  min={1}
                  value={form.buyQty}
                  onChange={(e) => set('buyQty', e.target.value)}
                  className={`${inputCls} w-16 text-right`}
                />
              </label>
              <label className="flex items-center gap-1">
                แถม
                <input
                  type="number"
                  min={1}
                  value={form.getQty}
                  onChange={(e) => set('getQty', e.target.value)}
                  className={`${inputCls} w-16 text-right`}
                />
                (ชิ้นถูกสุดฟรี)
              </label>
            </>
          )}
        </div>

        {/* เงื่อนไข */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <label className="flex items-center gap-1">
            ยอดขั้นต่ำ
            <input
              type="number"
              min={0}
              value={form.minSubtotal}
              onChange={(e) => set('minSubtotal', e.target.value)}
              placeholder="0"
              className={`${inputCls} w-24 text-right`}
            />
            บาท
          </label>
          <label className="flex items-center gap-1">
            เวลา
            <input
              type="time"
              value={form.start}
              onChange={(e) => set('start', e.target.value)}
              className={inputCls}
            />
            –
            <input
              type="time"
              value={form.end}
              onChange={(e) => set('end', e.target.value)}
              className={inputCls}
            />
          </label>
        </div>

        {/* วันในสัปดาห์ */}
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-slate-500">วัน:</span>
          {DAY_LABELS.map((label, i) => {
            const on = (form.daysOfWeek & (1 << i)) !== 0;
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`h-8 w-8 rounded-full text-xs font-semibold ${
                  on ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ตัวเลือกสมาชิก */}
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={form.membersOnly}
              onChange={(e) => set('membersOnly', e.target.checked)}
            />
            เฉพาะสมาชิก
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={form.birthdayOnly}
              onChange={(e) => set('birthdayOnly', e.target.checked)}
            />
            🎂 เฉพาะวันเกิดสมาชิก
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
            />
            เปิดใช้งาน
          </label>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {editingId ? 'บันทึกการแก้ไข' : '+ เพิ่มโปรโมชัน'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              ยกเลิก
            </button>
          )}
        </div>
      </form>

      {/* รายการ */}
      {loading ? (
        <p className="text-sm text-slate-400">กำลังโหลด...</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-slate-400">ยังไม่มีโปรโมชัน</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {list.map((p) => (
            <li
              key={p.id}
              className="flex items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{p.name}</span>
                  {!p.isActive && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-400">
                      ปิดอยู่
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{summary(p)}</p>
              </div>
              <div className="flex shrink-0 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => toggleActive(p)}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-600"
                >
                  {p.isActive ? 'ปิด' : 'เปิด'}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="rounded-lg bg-indigo-50 px-2.5 py-1 font-medium text-indigo-600"
                >
                  แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => remove(p)}
                  className="rounded-lg bg-rose-50 px-2.5 py-1 font-medium text-rose-600"
                >
                  ลบ
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
