import { useEffect, useState } from 'react';
import {
  getPrintMode,
  setPrintMode,
  getPrinterDots,
  setPrinterDots,
  type PrintMode,
} from '../../utils/printSettings';
import {
  isWebUsbSupported,
  requestUsbPrinter,
  hasGrantedPrinter,
  buildReceiptPayload,
  sendToPrinter,
} from '../../utils/escpos';
import { renderTestCanvas } from '../../utils/receiptCanvas';
import { useSubscriptionStore } from '../../store/subscriptionStore';

// ตั้งค่าการพิมพ์ของ "อุปกรณ์นี้" (เก็บใน localStorage) — ไม่ผูกกับร้าน/บัญชี
export function ManagePrinter() {
  // พิมพ์ครัวตรง ESC/POS = ฟีเจอร์แพ็กเกจโปร (พิมพ์ผ่านเบราว์เซอร์ใช้ได้ทุกแพ็กเกจ)
  const canThermal = useSubscriptionStore((s) => s.hasFeature('escpos_print'));
  const webUsb = isWebUsbSupported();
  const supported = webUsb && canThermal; // เปิดโหมด thermal ได้เมื่อเบราว์เซอร์รองรับ + แพ็กเกจปลดล็อก
  const [mode, setMode] = useState<PrintMode>(getPrintMode());
  const [dots, setDots] = useState<number>(getPrinterDots());
  const [connected, setConnected] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (supported) hasGrantedPrinter().then(setConnected).catch(() => setConnected(false));
  }, [supported]);

  function chooseMode(m: PrintMode): void {
    setMode(m);
    setPrintMode(m);
    setMsg(null);
    setErr(null);
  }

  function chooseDots(d: number): void {
    setDots(d);
    setPrinterDots(d);
  }

  async function connect(): Promise<void> {
    setErr(null);
    setMsg(null);
    try {
      const name = await requestUsbPrinter();
      setConnected(true);
      setMsg(`เชื่อมต่อแล้ว: ${name}`);
    } catch (e) {
      // ผู้ใช้กดยกเลิก dialog ก็เข้าทางนี้ — ไม่ถือเป็น error ร้ายแรง
      const m = e instanceof Error ? e.message : 'เชื่อมต่อไม่สำเร็จ';
      if (!/no device selected|cancelled|ผู้ใช้ยกเลิก/i.test(m)) setErr(m);
    }
  }

  async function test(): Promise<void> {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const canvas = await renderTestCanvas(dots);
      await sendToPrinter(buildReceiptPayload(canvas));
      setMsg('ส่งคำสั่งทดสอบไปเครื่องพิมพ์แล้ว');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'ทดสอบพิมพ์ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base font-bold">การพิมพ์ใบเสร็จ</h2>
      <p className="mb-4 text-xs text-slate-400">
        ตั้งค่าเฉพาะอุปกรณ์นี้ (จำไว้ในเครื่อง) — ไม่กระทบเครื่องอื่นของร้าน
      </p>

      {/* โหมดการพิมพ์ */}
      <div className="space-y-2">
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
            mode === 'browser' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'
          }`}
        >
          <input
            type="radio"
            name="printMode"
            checked={mode === 'browser'}
            onChange={() => chooseMode('browser')}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-semibold">ผ่านเบราว์เซอร์ (window.print)</span>
            <span className="block text-xs text-slate-500">
              ใช้ได้ทุกเครื่อง/ทุกเบราว์เซอร์ ผ่านหน้าต่างปริ้นต์ของระบบ
            </span>
          </span>
        </label>

        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
            mode === 'thermal' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'
          } ${supported ? '' : 'opacity-50'}`}
        >
          <input
            type="radio"
            name="printMode"
            checked={mode === 'thermal'}
            disabled={!supported}
            onChange={() => chooseMode('thermal')}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-semibold">
              เครื่อง thermal โดยตรง (ESC/POS · USB)
            </span>
            <span className="block text-xs text-slate-500">
              พิมพ์ทันทีไม่ผ่าน dialog — รองรับ Chrome/Edge บนคอม/Android เท่านั้น
            </span>
            {!canThermal && (
              <span className="mt-1 block text-xs font-semibold text-amber-700">
                🔒 ใช้ได้ในแพ็กเกจโปรขึ้นไป
              </span>
            )}
          </span>
        </label>
      </div>

      {!canThermal ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          พิมพ์ครัวตรง ESC/POS เป็นฟีเจอร์แพ็กเกจโปร — ดูแท็บ “แพ็กเกจ” เพื่ออัปเกรด
        </p>
      ) : (
        !webUsb && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            เบราว์เซอร์นี้ไม่รองรับ WebUSB — ใช้ได้เฉพาะการพิมพ์ผ่านเบราว์เซอร์
            (บน iPhone/iPad/Safari จะไม่มีโหมด thermal)
          </p>
        )
      )}

      {/* ตั้งค่าเครื่อง thermal */}
      {mode === 'thermal' && supported && (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 p-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">ความกว้างกระดาษ:</span>
            {[
              { d: 576, label: '80mm' },
              { d: 384, label: '58mm' },
            ].map((o) => (
              <button
                key={o.d}
                type="button"
                onClick={() => chooseDots(o.d)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  dots === o.d ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={connect}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
            >
              {connected ? 'เชื่อมต่อใหม่' : 'เชื่อมต่อเครื่องพิมพ์ USB'}
            </button>
            <button
              type="button"
              onClick={test}
              disabled={busy || !connected}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'กำลังส่ง...' : 'ทดสอบพิมพ์'}
            </button>
            <span
              className={`text-xs font-medium ${
                connected ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {connected ? '● เชื่อมต่อแล้ว' : '○ ยังไม่เชื่อมต่อ'}
            </span>
          </div>

          <p className="text-xs text-slate-400">
            หมายเหตุ: บน Windows เครื่องพิมพ์ต้องตั้ง driver เป็น WinUSB (เช่นด้วย Zadig)
            ถ้าระบบจับเป็นเครื่องพิมพ์ปกติอยู่ WebUSB จะเข้าถึงไม่ได้
          </p>
        </div>
      )}

      {msg && <p className="mt-3 text-sm text-emerald-600">{msg}</p>}
      {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
    </section>
  );
}
