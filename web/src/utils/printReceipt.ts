import type { CheckoutResult } from '../type/staff';

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
  quantity: number;
  unitPrice: number;
  amount: number;
}

function aggregate(items: CheckoutResult['orderItems']): ReceiptLine[] {
  const map = new Map<string, ReceiptLine>();
  for (const it of items) {
    const key = `${it.menuId}:${it.unitPrice}`;
    const line = map.get(key);
    if (line) {
      line.quantity += it.quantity;
      line.amount += it.unitPrice * it.quantity;
    } else {
      map.set(key, {
        name: it.itemName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        amount: it.unitPrice * it.quantity,
      });
    }
  }
  return [...map.values()];
}

// พิมพ์ใบเสร็จขนาด 80mm ผ่าน window.print() (ไม่ต้องลงไลบรารีเพิ่ม)
export function printReceipt(bill: CheckoutResult): void {
  const lines = aggregate(bill.orderItems);
  const subtotal = bill.subtotal ?? lines.reduce((s, l) => s + l.amount, 0);
  const discount = bill.discount ?? 0;
  const total = bill.totalPrice ?? subtotal - discount;
  const paidAt = bill.paidAt ?? new Date().toISOString();

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

  // บรรทัดสรุปยอด: โชว์ส่วนลด/รับเงิน/ทอนเฉพาะเมื่อมี
  const summary = [
    discount > 0
      ? `<div class="meta"><span>ยอดรวม</span><span>${baht(subtotal)}</span></div>
         <div class="meta"><span>ส่วนลด</span><span>-${baht(discount)}</span></div>`
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
        <td class="name" colspan="2">${escapeHtml(l.name)}</td>
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
      <div class="sub" style="margin-top:6px">ใบเสร็จรับเงิน</div>
    </div>

    <div class="hr"></div>

    <div class="meta">
      <span>โต๊ะ ${escapeHtml(bill.table.tableNumber)}</span>
      <span>${thaiDateTime(paidAt)}</span>
    </div>
    <div class="meta"><span>บิล #${bill.id}</span></div>

    <div class="hr"></div>

    <table>${rows}</table>

    <div class="hr"></div>

    ${summary}
    <div class="total">
      <span>รวมทั้งสิ้น</span>
      <span>${baht(total)} บาท</span>
    </div>

    <div class="center thanks">ขอบคุณที่ใช้บริการ</div>
  </div>
</body>
</html>`);
  win.document.close();
  win.focus();
  win.onafterprint = () => win.close();
  window.setTimeout(() => win.print(), 300);
}
