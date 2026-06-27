import { describe, it, expect } from 'vitest';
import { computeBillTotals, type BillCharges } from './bill-math';

// เงินทั้งหมดในเทสต์เป็นหน่วย "สตางค์" (100 สตางค์ = 1 บาท)
// rate เป็น basis points: 700 = 7.00%, 1000 = 10.00%
const NO_CHARGES: BillCharges = {
  vatRate: 0,
  vatInclusive: true,
  serviceChargeRate: 0,
};

describe('computeBillTotals', () => {
  it('ไม่มีภาษี/เซอร์วิส/ส่วนลด → total = subtotal', () => {
    const r = computeBillTotals(10000, 0, NO_CHARGES);
    expect(r).toEqual({
      subtotal: 10000,
      discount: 0,
      serviceCharge: 0,
      vatAmount: 0,
      total: 10000,
    });
  });

  it('เซอร์วิสชาร์จ 10% อย่างเดียว', () => {
    const r = computeBillTotals(10000, 0, {
      vatRate: 0,
      vatInclusive: true,
      serviceChargeRate: 1000,
    });
    expect(r.serviceCharge).toBe(1000);
    expect(r.vatAmount).toBe(0);
    expect(r.total).toBe(11000);
  });

  it('VAT 7% แบบบวกเพิ่ม (exclusive)', () => {
    const r = computeBillTotals(10000, 0, {
      vatRate: 700,
      vatInclusive: false,
      serviceChargeRate: 0,
    });
    expect(r.vatAmount).toBe(700);
    expect(r.total).toBe(10700);
  });

  it('VAT 7% แบบรวมในราคา (inclusive) → ถอดออกมาโชว์ ยอดไม่เปลี่ยน', () => {
    const r = computeBillTotals(10700, 0, {
      vatRate: 700,
      vatInclusive: true,
      serviceChargeRate: 0,
    });
    expect(r.vatAmount).toBe(700);
    expect(r.total).toBe(10700);
  });

  it('VAT inclusive จากยอดกลม → ปัดเศษ vat ลง', () => {
    const r = computeBillTotals(10000, 0, {
      vatRate: 700,
      vatInclusive: true,
      serviceChargeRate: 0,
    });
    // 10000*700/10700 = 654.20... → 654
    expect(r.vatAmount).toBe(654);
    expect(r.total).toBe(10000);
  });

  it('เซอร์วิสชาร์จ 10% + VAT 7% exclusive (VAT คิดบนยอด+เซอร์วิส)', () => {
    const r = computeBillTotals(10000, 0, {
      vatRate: 700,
      vatInclusive: false,
      serviceChargeRate: 1000,
    });
    expect(r.serviceCharge).toBe(1000); // 10% ของ 10000
    expect(r.vatAmount).toBe(770); // 7% ของ 11000
    expect(r.total).toBe(11770);
  });

  it('เซอร์วิสชาร์จ 10% + VAT 7% inclusive', () => {
    const r = computeBillTotals(10000, 0, {
      vatRate: 700,
      vatInclusive: true,
      serviceChargeRate: 1000,
    });
    expect(r.serviceCharge).toBe(1000);
    // 11000*700/10700 = 719.62... → 720
    expect(r.vatAmount).toBe(720);
    expect(r.total).toBe(11000);
  });

  it('มีส่วนลด → เซอร์วิส/VAT คิดบนยอดหลังหักส่วนลด', () => {
    const r = computeBillTotals(10000, 2000, {
      vatRate: 700,
      vatInclusive: false,
      serviceChargeRate: 1000,
    });
    expect(r.discount).toBe(2000);
    expect(r.serviceCharge).toBe(800); // 10% ของ 8000
    expect(r.vatAmount).toBe(616); // 7% ของ 8800
    expect(r.total).toBe(9416);
  });

  it('ส่วนลดมากกว่ายอด → clamp เท่ายอด total = 0', () => {
    const r = computeBillTotals(5000, 9999, NO_CHARGES);
    expect(r.discount).toBe(5000);
    expect(r.total).toBe(0);
  });

  it('ส่วนลดติดลบ → clamp เป็น 0', () => {
    const r = computeBillTotals(5000, -100, NO_CHARGES);
    expect(r.discount).toBe(0);
    expect(r.total).toBe(5000);
  });

  it('อัตราติดลบ → clamp เป็น 0 (ไม่คิดเซอร์วิส/VAT)', () => {
    const r = computeBillTotals(10000, 0, {
      vatRate: -700,
      vatInclusive: false,
      serviceChargeRate: -500,
    });
    expect(r.serviceCharge).toBe(0);
    expect(r.vatAmount).toBe(0);
    expect(r.total).toBe(10000);
  });

  it('ปัดเศษครึ่งสตางค์ขึ้น (Math.round .5 → ขึ้น)', () => {
    const r = computeBillTotals(15, 0, {
      vatRate: 0,
      vatInclusive: true,
      serviceChargeRate: 1000,
    });
    // 15*1000/10000 = 1.5 → 2
    expect(r.serviceCharge).toBe(2);
    expect(r.total).toBe(17);
  });

  it('เคสจริงผสม: ส่วนลด + เซอร์วิส 10% + VAT 7% inclusive', () => {
    const r = computeBillTotals(12345, 345, {
      vatRate: 700,
      vatInclusive: true,
      serviceChargeRate: 1000,
    });
    expect(r.discount).toBe(345);
    expect(r.serviceCharge).toBe(1200); // 10% ของ 12000
    // 13200*700/10700 = 863.55 → 864
    expect(r.vatAmount).toBe(864);
    expect(r.total).toBe(13200);
  });

  it('subtotal = 0 → ทุกอย่างเป็น 0', () => {
    const r = computeBillTotals(0, 0, {
      vatRate: 700,
      vatInclusive: false,
      serviceChargeRate: 1000,
    });
    expect(r).toEqual({
      subtotal: 0,
      discount: 0,
      serviceCharge: 0,
      vatAmount: 0,
      total: 0,
    });
  });

  it('total ไม่ติดลบเสมอ และ echo subtotal กลับมา', () => {
    const r = computeBillTotals(8888, 1234, {
      vatRate: 700,
      vatInclusive: false,
      serviceChargeRate: 1000,
    });
    expect(r.subtotal).toBe(8888);
    expect(r.total).toBeGreaterThanOrEqual(0);
  });
});
