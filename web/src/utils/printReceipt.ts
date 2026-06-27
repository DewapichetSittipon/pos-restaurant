import QRCode from 'qrcode';
import type { CheckoutResult } from '../type/staff';
import { promptpayPayload } from './promptpay';

// แปลงสตางค์ -> ตัวเลขบาท (ไม่มีสัญลักษณ์ ฿ เพราะ thermal บางตัวพิมพ์ไม่ได้)
function baht(satang: number): string {
  return (satang / 100).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function thaiDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// รวมรายการที่เป็นเมนูเดียวกัน (สั่งหลายรอบ/หลาย batch) ให้เหลือบรรทัดเดียว
interface ReceiptLine {
  name: string;
  modifiers: string; // ชื่อตัวเลือกรวมเป็นข้อความเดียว (ว่าง = ไม่มี)
  quantity: number;
  unitPrice: number;
  amount: number;
}

function aggregate(items: CheckoutResult['orderItems']): ReceiptLine[] {
  const map = new Map<string, ReceiptLine>();
  for (const it of items) {
    const mods = (it.modifiers ?? []).map((m) => m.name).join(', ');
    const key = `${it.menuId}:${it.unitPrice}:${mods}`;
    const line = map.get(key);
    if (line) {
      line.quantity += it.quantity;
      line.amount += it.unitPrice * it.quantity;
    } else {
      map.set(key, {
        name: it.itemName,
        modifiers: mods,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        amount: it.unitPrice * it.quantity,
      });
    }
  }
  return [...map.values()];
}

// พิมพ์ใบเสร็จขนาด 80mm ผ่าน window.print() (async เพราะสร้าง QR PromptPay)
export async function printReceipt(bill: CheckoutResult): Promise<void> {
  const lines = aggregate(bill.orderItems);
  const subtotal = bill.subtotal ?? lines.reduce((s, l) => s + l.amount, 0);
  const discount = bill.discount ?? 0;
  const serviceCharge = bill.serviceCharge ?? 0;
  const vatAmount = bill.vatAmount ?? 0;
  const vatRate = bill.vatRate ?? 0;
  const serviceChargeRate = bill.serviceChargeRate ?? 0;
  const vatInclusive = bill.vatInclusive ?? true;
  const pointsRedeemed = bill.pointsRedeemed ?? 0;
  const pointsEarned = bill.pointsEarned ?? 0;
  const total = bill.totalPrice ?? subtotal - discount;
  const paidAt = bill.paidAt ?? new Date().toISOString();

  // ร้านที่มีเลขผู้เสียภาษี → ออกเป็น "ใบกำกับภาษีอย่างย่อ" (เหมาะกับร้านอาหาร/ขายปลีก) มิฉะนั้นเป็นใบเสร็จรับเงิน
  const docLabel = bill.shop.taxId ? 'ใบกำกับภาษีอย่างย่อ' : 'ใบเสร็จรับเงิน';
  // เลขที่เอกสารรันต่อเนื่องต่อร้าน — แสดงแบบเติมศูนย์ 6 หลัก (เช่น 000042)
  const receiptNo =
    bill.receiptNumber != null
      ? String(bill.receiptNumber).padStart(6, '0')
      : null;
  // dine-in → "โต๊ะ X"; takeaway/delivery → server ตั้ง tableNumber เป็นป้ายประเภทไว้แล้ว
  const isDineIn = !bill.orderType || bill.orderType === 'dine_in';
  const placeLabel = isDineIn
    ? `โต๊ะ ${escapeHtml(bill.table.tableNumber)}`
    : escapeHtml(bill.table.tableNumber);
  const customerLine =
    !isDineIn && (bill.customerName || bill.customerPhone)
      ? `<div class="meta"><span>${escapeHtml(bill.customerName ?? '')}${
          bill.customerPhone ? ` · ${escapeHtml(bill.customerPhone)}` : ''
        }</span></div>`
      : '';
  const addressLine =
    bill.deliveryAddress
      ? `<div class="meta"><span>📍 ${escapeHtml(bill.deliveryAddress)}</span></div>`
      : '';

  const pct = (bp: number): string => (bp / 100).toLocaleString('th-TH');
  // โชว์บรรทัดยอดรวม(ก่อนปรับ) เมื่อมีส่วนลด/แลกแต้ม/เซอร์วิส/VAT อย่างใดอย่างหนึ่ง
  const hasAdjustments =
    discount > 0 ||
    pointsRedeemed > 0 ||
    serviceCharge > 0 ||
    vatRate > 0 ||
    (bill.deliveryFee ?? 0) > 0;

  const methodLabel =
    bill.paymentMethod === 'cash'
      ? 'เงินสด'
      : bill.paymentMethod === 'transfer'
        ? 'เงินโอน'
        : null;
  const change =
    bill.paymentMethod === 'cash' && bill.receivedAmount != null
      ? bill.receivedAmount - total
      : null;

  // บรรทัดสรุปยอด: โชว์ยอดรวม/ส่วนลด/เซอร์วิส/VAT/รับเงิน/ทอนเฉพาะเมื่อมี
  const summary = [
    hasAdjustments
      ? `<div class="meta"><span>ยอดรวม</span><span>${baht(subtotal)}</span></div>`
      : '',
    discount > 0
      ? `<div class="meta"><span>ส่วนลด</span><span>-${baht(discount)}</span></div>`
      : '',
    pointsRedeemed > 0
      ? `<div class="meta"><span>แลกแต้ม ${pointsRedeemed} แต้ม</span><span>-${baht(pointsRedeemed * 100)}</span></div>`
      : '',
    serviceCharge > 0
      ? `<div class="meta"><span>เซอร์วิสชาร์จ ${pct(serviceChargeRate)}%</span><span>${baht(serviceCharge)}</span></div>`
      : '',
    vatRate > 0
      ? `<div class="meta"><span>VAT ${pct(vatRate)}%${vatInclusive ? ' (รวมแล้ว)' : ''}</span><span>${baht(vatAmount)}</span></div>`
      : '',
    (bill.deliveryFee ?? 0) > 0
      ? `<div class="meta"><span>ค่าส่ง</span><span>${baht(bill.deliveryFee)}</span></div>`
      : '',
    methodLabel
      ? `<div class="meta"><span>ชำระโดย</span><span>${methodLabel}</span></div>`
      : '',
    bill.receivedAmount != null
      ? `<div class="meta"><span>รับเงิน</span><span>${baht(bill.receivedAmount)}</span></div>`
      : '',
    change != null
      ? `<div class="meta"><span>เงินทอน</span><span>${baht(change)}</span></div>`
      : '',
  ].join('');

  // บล็อกแต้มสมาชิก (ถ้ามี) — ได้รับ + คงเหลือ
  const pointsBlock =
    pointsEarned > 0 || bill.member
      ? `<div class="hr"></div>
         ${pointsEarned > 0 ? `<div class="meta"><span>ได้รับแต้ม</span><span>+${pointsEarned}</span></div>` : ''}
         ${bill.member ? `<div class="meta"><span>แต้มคงเหลือ</span><span>${bill.member.pointsBalance}</span></div>` : ''}`
      : '';

  // QR PromptPay — เฉพาะจ่ายแบบโอน + ร้านตั้ง PromptPay ไว้
  let qrBlock = '';
  if (bill.paymentMethod === 'transfer' && bill.shop.promptpayId && total > 0) {
    const svg = await QRCode.toString(
      promptpayPayload(bill.shop.promptpayId, total),
      { type: 'svg', margin: 0 },
    );
    qrBlock = `<div class="qr">${svg}<div class="sub">สแกนจ่ายผ่าน PromptPay</div></div>`;
  }

  // หัวร้าน — โชว์เฉพาะบรรทัดที่มีข้อมูล
  const headerLines = [
    bill.shop.address,
    bill.shop.phone ? `โทร. ${bill.shop.phone}` : null,
    bill.shop.taxId ? `เลขผู้เสียภาษี ${bill.shop.taxId}` : null,
  ]
    .filter((v): v is string => Boolean(v))
    .map((v) => `<div class="sub">${escapeHtml(v)}</div>`)
    .join('');

  const rows = lines
    .map(
      (l) => `
      <tr class="item">
        <td class="name" colspan="2">${escapeHtml(l.name)}${
          l.modifiers
            ? `<div class="sub">+ ${escapeHtml(l.modifiers)}</div>`
            : ''
        }</td>
      </tr>
      <tr class="item">
        <td class="qty">${l.quantity} x ${baht(l.unitPrice)}</td>
        <td class="amt">${baht(l.amount)}</td>
      </tr>`,
    )
    .join('');

  const win = window.open('', '_blank', 'width=380,height=640');
  if (!win) {
    window.alert('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ — กรุณาอนุญาต popup แล้วลองใหม่');
    return;
  }

  win.document.write(`<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>ใบเสร็จ โต๊ะ ${escapeHtml(bill.table.tableNumber)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: 'Noto Sans Thai', -apple-system, 'Segoe UI', sans-serif;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt {
      width: 72mm;
      margin: 0 auto;
      padding: 6px 4px 12px;
      font-size: 13px;
      line-height: 1.45;
    }
    .center { text-align: center; }
    .shop { font-size: 17px; font-weight: 700; }
    .sub { font-size: 12px; margin-top: 2px; }
    .hr { border-top: 1px dashed #000; margin: 8px 0; }
    .meta { display: flex; justify-content: space-between; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 0; }
    .name { padding-top: 4px; }
    .qty { color: #000; padding-bottom: 2px; }
    .amt { text-align: right; white-space: nowrap; }
    .total {
      display: flex;
      justify-content: space-between;
      font-size: 16px;
      font-weight: 700;
      margin-top: 4px;
    }
    .thanks { margin-top: 10px; font-size: 13px; }
    .qr { text-align: center; margin-top: 10px; }
    .qr svg { width: 42mm; height: 42mm; }
    @media print {
      @page { margin: 0; }
      .receipt { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center">
      <div class="shop">${escapeHtml(bill.shop.name)}</div>
      ${headerLines}
      <div class="sub" style="margin-top:6px">${docLabel}</div>
    </div>

    <div class="hr"></div>

    ${
      receiptNo
        ? `<div class="meta"><span>เลขที่</span><span>${receiptNo}</span></div>`
        : ''
    }
    <div class="meta">
      <span>${placeLabel}</span>
      <span>${thaiDateTime(paidAt)}</span>
    </div>
    ${customerLine}
    ${addressLine}
    <div class="meta"><span>บิล #${bill.id}</span></div>

    <div class="hr"></div>

    <table>${rows}</table>

    <div class="hr"></div>

    ${summary}
    <div class="total">
      <span>รวมทั้งสิ้น</span>
      <span>${baht(total)} บาท</span>
    </div>

    ${pointsBlock}

    ${qrBlock}

    <div class="center thanks">ขอบคุณที่ใช้บริการ</div>
  </div>
</body>
</html>`);
  win.document.close();
  win.focus();
  win.onafterprint = () => win.close();
  window.setTimeout(() => win.print(), 300);
}
