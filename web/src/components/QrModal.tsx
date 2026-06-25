import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QrModalProps {
  tableNumber: string;
  url: string;
  onClose: () => void;
}

export function QrModal({ tableNumber, url, onClose }: QrModalProps) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function print(): void {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const win = window.open('', '_blank', 'width=420,height=620');
    if (!win) return;

    win.document.write(`<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>QR โต๊ะ ${tableNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      font-family: -apple-system, 'Segoe UI', 'Noto Sans Thai', sans-serif;
      color: #0f172a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      width: 340px;
      border-radius: 28px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      text-align: center;
    }
    .head {
      background: linear-gradient(135deg, #4f46e5, #6366f1);
      color: #fff;
      padding: 26px 20px 30px;
    }
    .head .label {
      font-size: 13px;
      letter-spacing: 4px;
      text-transform: uppercase;
      opacity: 0.85;
    }
    .head .num {
      font-size: 64px;
      font-weight: 800;
      line-height: 1;
      margin-top: 6px;
    }
    .body {
      background: #fff;
      padding: 28px 24px 30px;
    }
    .qr {
      display: inline-block;
      padding: 16px;
      border-radius: 20px;
      background: #fff;
      border: 2px solid #eef2ff;
    }
    .qr svg { display: block; width: 230px; height: 230px; }
    .cta {
      margin-top: 22px;
      font-size: 20px;
      font-weight: 700;
      color: #4f46e5;
    }
    .hint {
      margin-top: 6px;
      font-size: 14px;
      color: #64748b;
    }
    @media print {
      @page { margin: 0; }
      body { padding: 0; }
      .card { border: none; box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="head">
      <div class="label">TABLE</div>
      <div class="num">${tableNumber}</div>
    </div>
    <div class="body">
      <div class="qr">${svg.outerHTML}</div>
      <div class="cta">สแกนเพื่อสั่งอาหาร</div>
      <div class="hint">เปิดกล้องมือถือแล้วสแกน QR นี้ได้เลย</div>
    </div>
  </div>
</body>
</html>`);
    win.document.close();
    win.focus();
    win.onafterprint = () => win.close();
    window.setTimeout(() => win.print(), 300);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl">
        <h2 className="mb-1 text-lg font-bold">โต๊ะ {tableNumber}</h2>
        <p className="mb-4 text-sm text-slate-500">ให้ลูกค้าสแกนเพื่อสั่งอาหาร</p>

        <div
          ref={qrRef}
          className="mx-auto mb-4 w-fit rounded-xl border border-slate-200 bg-white p-3"
        >
          <QRCodeSVG value={url} size={200} level="M" />
        </div>

        <p className="mb-3 break-all rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          {url}
        </p>

        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white"
          >
            {copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกลิงก์'}
          </button>
          <button
            type="button"
            onClick={print}
            className="flex-1 rounded-lg bg-slate-800 py-2.5 text-sm font-semibold text-white"
          >
            🖨️ พิมพ์
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-slate-100 py-2.5 text-sm font-semibold text-slate-700"
        >
          ปิด
        </button>
      </div>
    </div>
  );
}
