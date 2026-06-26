// สูตรคำนวณยอดบิล (ส่วนลด → เซอร์วิสชาร์จ → VAT) — เก็บเงินเป็น integer สตางค์
// ⚠️ มีสำเนาที่เหมือนกันฝั่ง backend ที่ backend/src/common/bill-math.ts — แก้ต้องแก้ทั้งสองที่ให้ตรงกัน
// อัตรา (rate) เป็น basis points: 700 = 7.00%, 1000 = 10.00%, 0 = ไม่คิด

export interface BillCharges {
  vatRate: number; // basis points
  vatInclusive: boolean; // true = ราคาเมนูรวม VAT แล้ว, false = บวกเพิ่ม
  serviceChargeRate: number; // basis points
}

export interface BillTotals {
  subtotal: number; // ก่อนหักส่วนลด
  discount: number; // ที่ใช้จริง (clamp แล้ว)
  serviceCharge: number;
  vatAmount: number; // inclusive = ส่วนที่ถอดออกมาโชว์ (อยู่ในยอดแล้ว)
  total: number; // ยอดสุทธิที่ต้องจ่าย
}

// เซอร์วิสชาร์จคิดบนยอดหลังหักส่วนลด; VAT คิดบน (ยอดหลังหักส่วนลด + เซอร์วิสชาร์จ)
export function computeBillTotals(
  subtotal: number,
  discount: number,
  charges: BillCharges,
): BillTotals {
  const appliedDiscount = Math.min(Math.max(discount, 0), subtotal);
  const base = subtotal - appliedDiscount;

  const serviceChargeRate = Math.max(charges.serviceChargeRate, 0);
  const serviceCharge = Math.round((base * serviceChargeRate) / 10000);

  const taxBase = base + serviceCharge;
  const vatRate = Math.max(charges.vatRate, 0);

  let vatAmount = 0;
  let total = taxBase;
  if (vatRate > 0) {
    if (charges.vatInclusive) {
      vatAmount = Math.round((taxBase * vatRate) / (10000 + vatRate));
      total = taxBase;
    } else {
      vatAmount = Math.round((taxBase * vatRate) / 10000);
      total = taxBase + vatAmount;
    }
  }

  return { subtotal, discount: appliedDiscount, serviceCharge, vatAmount, total };
}
