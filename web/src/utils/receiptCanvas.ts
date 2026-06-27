import QRCode from 'qrcode';
import type { CheckoutResult } from '../type/staff';
import { promptpayPayload } from './promptpay';

// เรนเดอร์ใบเสร็จเป็น canvas ขาว-ดำ สำหรับพิมพ์ ESC/POS raster
// ⚠️ layout/ตรรกะสรุปยอด mirror กับ web/src/utils/printReceipt.ts (เวอร์ชัน HTML) — แก้ต้องดูทั้งสองที่
// ความกว้างมาตรฐานเครื่องพิมพ์ thermal 80mm = 576 dots (203dpi)

const FONT = "'Noto Sans Thai', -apple-system, 'Segoe UI', sans-serif";

function baht(satang: number): string {
  return (satang / 100).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function thaiDateTime(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ReceiptLine {
  name: string;
  modifiers: string;
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

// canvas ทดสอบพิมพ์ — ตรวจว่า transport + การเรนเดอร์ภาษาไทยเป็น raster ใช้ได้
export async function renderTestCanvas(dots = 576): Promise<HTMLCanvasElement> {
  if (document.fonts?.ready) {
    try {
      await document.fonts.load(`700 30px ${FONT}`);
      await document.fonts.ready;
    } catch {
      /* ใช้ฟอนต์ระบบ */
    }
  }
  const c = document.createElement('canvas');
  c.width = dots;
  c.height = 220;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas ไม่พร้อม');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText('ทดสอบการพิมพ์', dots / 2, 60);
  ctx.font = `400 22px ${FONT}`;
  ctx.fillText('ภาษาไทย ABC 0123456789 ฿', dots / 2, 100);
  ctx.fillText('ก ข ค ง จ ฉ ช — ใบเสร็จ', dots / 2, 135);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 160, dots - 40, 40);
  return c;
}

// เครื่องมือวาดแบบไหลลงตามแกน y
class Pen {
  y = 0;
  constructor(
    readonly ctx: CanvasRenderingContext2D,
    readonly width: number,
    readonly pad: number,
  ) {}

  private get right(): number {
    return this.width - this.pad;
  }

  gap(px: number): void {
    this.y += px;
  }

  // เส้นประคั่น
  dashed(): void {
    const { ctx } = this;
    this.y += 10;
    ctx.save();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(this.pad, this.y);
    ctx.lineTo(this.right, this.y);
    ctx.stroke();
    ctx.restore();
    this.y += 12;
  }

  center(text: string, size: number, weight = 400): void {
    const { ctx } = this;
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    this.y += size;
    ctx.fillText(text, this.width / 2, this.y);
    this.y += 4;
  }

  // ซ้าย-ขวาในบรรทัดเดียว (label / value)
  row(label: string, value: string, size = 22, weight = 400): void {
    const { ctx } = this;
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = '#000';
    this.y += size;
    ctx.textAlign = 'left';
    ctx.fillText(label, this.pad, this.y);
    if (value) {
      ctx.textAlign = 'right';
      ctx.fillText(value, this.right, this.y);
    }
    this.y += 6;
  }

  // ข้อความซ้าย ตัดบรรทัดอัตโนมัติเมื่อยาวเกิน
  leftWrap(text: string, size = 22, weight = 400): void {
    const { ctx } = this;
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'left';
    const maxW = this.width - this.pad * 2;
    const words = text.split('');
    let buf = '';
    const flush = (s: string) => {
      this.y += size;
      ctx.fillText(s, this.pad, this.y);
      this.y += 4;
    };
    for (const ch of words) {
      if (ctx.measureText(buf + ch).width > maxW && buf) {
        flush(buf);
        buf = ch;
      } else {
        buf += ch;
      }
    }
    if (buf) flush(buf);
  }
}

// วาดใบเสร็จลง canvas แล้วคืน canvas ที่ตัดความสูงพอดี (ขาวบนพื้นขาว)
export async function renderReceiptCanvas(
  bill: CheckoutResult,
  dots = 576,
): Promise<HTMLCanvasElement> {
  // ให้ฟอนต์ไทยพร้อมก่อนวาด (ไม่งั้น measureText/วาดอาจใช้ fallback)
  if (document.fonts?.ready) {
    try {
      await document.fonts.load(`700 30px ${FONT}`);
      await document.fonts.ready;
    } catch {
      /* ใช้ฟอนต์ระบบแทน */
    }
  }

  const big = document.createElement('canvas');
  big.width = dots;
  big.height = 4000; // เผื่อสูง แล้วค่อยตัด
  const ctx = big.getContext('2d');
  if (!ctx) throw new Error('canvas ไม่พร้อม');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, big.width, big.height);
  ctx.textBaseline = 'alphabetic';

  const pad = 16;
  const pen = new Pen(ctx, dots, pad);

  // ---- คำนวณยอด (mirror printReceipt) ----
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
  const deliveryFee = bill.deliveryFee ?? 0;
  const total = bill.totalPrice ?? subtotal - discount;
  const paidAt = bill.paidAt ?? new Date().toISOString();

  const docLabel = bill.shop.taxId ? 'ใบกำกับภาษีอย่างย่อ' : 'ใบเสร็จรับเงิน';
  const receiptNo =
    bill.receiptNumber != null ? String(bill.receiptNumber).padStart(6, '0') : null;
  const isDineIn = !bill.orderType || bill.orderType === 'dine_in';
  const placeLabel = isDineIn ? `โต๊ะ ${bill.table.tableNumber}` : bill.table.tableNumber;
  const pct = (bp: number): string => (bp / 100).toLocaleString('th-TH');
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
  const hasAdjustments =
    discount > 0 || pointsRedeemed > 0 || serviceCharge > 0 || vatRate > 0 || deliveryFee > 0;

  // ---- หัวร้าน ----
  pen.gap(6);
  pen.center(bill.shop.name, 32, 700);
  for (const h of [
    bill.shop.address,
    bill.shop.phone ? `โทร. ${bill.shop.phone}` : null,
    bill.shop.taxId ? `เลขผู้เสียภาษี ${bill.shop.taxId}` : null,
  ]) {
    if (h) pen.center(h, 18);
  }
  pen.gap(4);
  pen.center(docLabel, 20);
  pen.dashed();

  // ---- ข้อมูลบิล ----
  if (receiptNo) pen.row('เลขที่', receiptNo);
  pen.row(placeLabel, thaiDateTime(paidAt));
  if (!isDineIn && (bill.customerName || bill.customerPhone)) {
    pen.leftWrap(
      [bill.customerName, bill.customerPhone].filter(Boolean).join(' · '),
      18,
    );
  }
  if (bill.deliveryAddress) pen.leftWrap(`📍 ${bill.deliveryAddress}`, 18);
  pen.row(`บิล #${bill.id}`, '');
  pen.dashed();

  // ---- รายการ ----
  for (const l of lines) {
    pen.leftWrap(l.name, 22, 500);
    if (l.modifiers) pen.leftWrap(`+ ${l.modifiers}`, 18);
    pen.row(`${l.quantity} x ${baht(l.unitPrice)}`, baht(l.amount), 20);
  }
  pen.dashed();

  // ---- สรุปยอด ----
  if (hasAdjustments) pen.row('ยอดรวม', baht(subtotal), 20);
  if (discount > 0) pen.row('ส่วนลด', `-${baht(discount)}`, 20);
  if (pointsRedeemed > 0)
    pen.row(`แลกแต้ม ${pointsRedeemed} แต้ม`, `-${baht(pointsRedeemed * 100)}`, 20);
  if (serviceCharge > 0)
    pen.row(`เซอร์วิสชาร์จ ${pct(serviceChargeRate)}%`, baht(serviceCharge), 20);
  if (vatRate > 0)
    pen.row(
      `VAT ${pct(vatRate)}%${vatInclusive ? ' (รวมแล้ว)' : ''}`,
      baht(vatAmount),
      20,
    );
  if (deliveryFee > 0) pen.row('ค่าส่ง', baht(deliveryFee), 20);

  pen.gap(4);
  pen.row('รวมทั้งสิ้น', `${baht(total)} บาท`, 28, 700);
  pen.gap(2);

  if (methodLabel) pen.row('ชำระโดย', methodLabel, 20);
  if (bill.receivedAmount != null) pen.row('รับเงิน', baht(bill.receivedAmount), 20);
  if (change != null) pen.row('เงินทอน', baht(change), 20);

  // ---- แต้มสมาชิก ----
  if (pointsEarned > 0 || bill.member) {
    pen.dashed();
    if (pointsEarned > 0) pen.row('ได้รับแต้ม', `+${pointsEarned}`, 20);
    if (bill.member) pen.row('แต้มคงเหลือ', String(bill.member.pointsBalance), 20);
  }

  // ---- QR PromptPay ----
  if (bill.paymentMethod === 'transfer' && bill.shop.promptpayId && total > 0) {
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, promptpayPayload(bill.shop.promptpayId, total), {
      margin: 1,
      width: 240,
      color: { dark: '#000000', light: '#ffffff' },
    });
    pen.gap(14);
    const qx = (dots - qrCanvas.width) / 2;
    ctx.drawImage(qrCanvas, qx, pen.y);
    pen.y += qrCanvas.height;
    pen.center('สแกนจ่ายผ่าน PromptPay', 18);
  }

  pen.gap(10);
  pen.center('ขอบคุณที่ใช้บริการ', 22);
  pen.gap(24);

  // ---- ตัดความสูงให้พอดี ----
  const usedHeight = Math.min(Math.ceil(pen.y), big.height);
  const out = document.createElement('canvas');
  out.width = dots;
  out.height = usedHeight;
  const octx = out.getContext('2d');
  if (!octx) throw new Error('canvas ไม่พร้อม');
  octx.fillStyle = '#fff';
  octx.fillRect(0, 0, out.width, out.height);
  octx.drawImage(big, 0, 0);
  return out;
}
